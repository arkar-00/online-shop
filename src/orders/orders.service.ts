import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderFilterDto } from './dto/order-filter.dto';
import { CartService } from '../cart/cart.service';
import { OffersService } from '../offers/offers.service';
import { OrderStatus } from './enums/order-status.enum';
import { PaymentStatus } from './enums/payment-status.enum';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(OrderStatusHistory)
    private statusHistoryRepository: Repository<OrderStatusHistory>,
    private cartService: CartService,
    private offersService: OffersService,
  ) {}

  async create(userId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    // Get cart
    const cart = await this.cartService.getCart(userId);

    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Apply coupon if provided
    let discount = 0;
    let offerId: string | undefined = undefined;

    if (createOrderDto.couponCode) {
      try {
        const cartWithCoupon = await this.cartService.applyCoupon(
          userId,
          createOrderDto.couponCode,
        );
        discount = cartWithCoupon.summary.discount;
        offerId = cartWithCoupon.appliedOffer.id;
      } catch (error) {
        // If coupon is invalid, continue without discount
        console.log('Coupon error:', error.message);
      }
    }

    // Generate order number
    const orderNumber = await this.generateOrderNumber();

    // Calculate totals
    const subtotal = cart.summary.subtotal;
    const tax = cart.summary.tax;
    const shippingCost = cart.summary.shippingCost;
    const total = subtotal + tax + shippingCost - discount;

    // Create order
    const order = this.ordersRepository.create({
      orderNumber,
      userId,
      subtotal,
      tax,
      shippingCost,
      discount,
      total,
      couponCode: createOrderDto.couponCode,
      offerId,
      shippingName: createOrderDto.shippingAddress.name,
      shippingPhone: createOrderDto.shippingAddress.phone,
      shippingAddress: createOrderDto.shippingAddress.address,
      shippingCity: createOrderDto.shippingAddress.city,
      shippingState: createOrderDto.shippingAddress.state,
      shippingZipCode: createOrderDto.shippingAddress.zipCode,
      shippingCountry: createOrderDto.shippingAddress.country,
      billingAddress: createOrderDto.billingAddress,
      paymentMethod: createOrderDto.paymentMethod,
      customerNotes: createOrderDto.customerNotes,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
    });

    // ✅ FIX: Save order first and get the saved entity
    const savedOrder = await this.ordersRepository.save(order);

    // Create order items
    const orderItems = cart.items.map(cartItem => {
      return this.orderItemsRepository.create({
        orderId: savedOrder.id, // ✅ Use savedOrder.id (single object)
        productId: cartItem.productId,
        variantId: cartItem.variantId,
        productName: cartItem.product.name,
        variantName: cartItem.variant?.name,
        productImage: cartItem.product.images?.[0],
        quantity: cartItem.quantity,
        price: cartItem.price,
        subtotal: cartItem.price * cartItem.quantity,
      });
    });

    await this.orderItemsRepository.save(orderItems);

    // Create initial status history
    await this.createStatusHistory(savedOrder.id, OrderStatus.PENDING, 'Order created'); // ✅ Use savedOrder.id

    // Increment offer usage if coupon was used
    if (offerId) {
      await this.offersService.incrementUsageCount(offerId);
    }

    // Clear cart
    await this.cartService.clearCart(userId);

    // Return complete order with relations
    return this.findOne(savedOrder.id);
  }

  async findAll(filterDto?: OrderFilterDto): Promise<Order[]> {
    const queryBuilder = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('order.user', 'user')
      .select([
        'order',
        'items',
        'product.id',
        'product.name',
        'product.slug',
        'product.images',
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
      ]);

    if (filterDto?.status) {
      queryBuilder.andWhere('order.status = :status', { status: filterDto.status });
    }

    if (filterDto?.orderNumber) {
      queryBuilder.andWhere('order.orderNumber ILIKE :orderNumber', {
        orderNumber: `%${filterDto.orderNumber}%`,
      });
    }

    if (filterDto?.ongoingOnly) {
      queryBuilder.andWhere('order.status NOT IN (:...statuses)', {
        statuses: [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
      });
    }

    queryBuilder.orderBy('order.createdAt', 'DESC');

    return await queryBuilder.getMany();
  }

  async findByUser(userId: string, filterDto?: OrderFilterDto): Promise<Order[]> {
    const queryBuilder = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .where('order.userId = :userId', { userId });

    if (filterDto?.status) {
      queryBuilder.andWhere('order.status = :status', { status: filterDto.status });
    }

    if (filterDto?.ongoingOnly) {
      queryBuilder.andWhere('order.status NOT IN (:...statuses)', {
        statuses: [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
      });
    }

    queryBuilder.orderBy('order.createdAt', 'DESC');

    return await queryBuilder.getMany();
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: [
        'items',
        'items.product',
        'items.variant',
        'statusHistory',
        'statusHistory.changedByUser',
        'user',
      ],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async findByOrderNumber(orderNumber: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { orderNumber },
      relations: [
        'items',
        'items.product',
        'items.variant',
        'statusHistory',
        'statusHistory.changedByUser',
        'user',
      ],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateStatus(
    orderId: string,
    updateStatusDto: UpdateOrderStatusDto,
    adminId?: string,
  ): Promise<Order> {
    const order = await this.findOne(orderId);

    order.status = updateStatusDto.status;

    // Update timestamp based on status
    const now = new Date();
    switch (updateStatusDto.status) {
      case OrderStatus.CONFIRMED:
        order.confirmedAt = now;
        break;
      case OrderStatus.SHIPPED:
        order.shippedAt = now;
        break;
      case OrderStatus.DELIVERED:
        order.deliveredAt = now;
        break;
      case OrderStatus.CANCELLED:
        order.cancelledAt = now;
        break;
    }

    await this.ordersRepository.save(order);

    // Create status history
    await this.createStatusHistory(orderId, updateStatusDto.status, updateStatusDto.notes, adminId);

    return this.findOne(orderId);
  }

  async cancelOrder(userId: string, orderId: string, reason?: string): Promise<Order> {
    const order = await this.findOne(orderId);

    if (order.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own orders');
    }

    if (order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('Cannot cancel shipped or delivered orders');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled');
    }

    return this.updateStatus(
      orderId,
      {
        status: OrderStatus.CANCELLED,
        notes: reason || 'Cancelled by customer',
      },
      userId,
    );
  }

  private async createStatusHistory(
    orderId: string,
    status: OrderStatus,
    notes?: string,
    changedBy?: string,
  ): Promise<void> {
    const history = this.statusHistoryRepository.create({
      orderId,
      status,
      notes,
      changedBy,
    });

    await this.statusHistoryRepository.save(history);
  }

  private async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.ordersRepository.count();
    const number = (count + 1).toString().padStart(6, '0');
    return `ORD-${year}-${number}`;
  }

  async getOrderStats() {
    const total = await this.ordersRepository.count();
    const pending = await this.ordersRepository.count({
      where: { status: OrderStatus.PENDING },
    });
    const processing = await this.ordersRepository.count({
      where: { status: In([OrderStatus.CONFIRMED, OrderStatus.PROCESSING]) },
    });
    const shipped = await this.ordersRepository.count({
      where: { status: OrderStatus.SHIPPED },
    });
    const delivered = await this.ordersRepository.count({
      where: { status: OrderStatus.DELIVERED },
    });
    const cancelled = await this.ordersRepository.count({
      where: { status: OrderStatus.CANCELLED },
    });

    return {
      total,
      pending,
      processing,
      shipped,
      delivered,
      cancelled,
    };
  }
}
