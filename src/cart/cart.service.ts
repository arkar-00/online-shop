import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from './entities/cart-item.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ProductsService } from '../products/products.service';
import { OffersService } from '../offers/offers.service';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private cartItemsRepository: Repository<CartItem>,
    private productsService: ProductsService,
    private offersService: OffersService,
  ) {}

  async addToCart(userId: string, addToCartDto: AddToCartDto): Promise<CartItem> {
    const { productId, variantId, quantity } = addToCartDto;

    // Verify product exists
    const product = await this.productsService.findOne(productId);

    // Get price
    let price = product.basePrice;
    if (variantId) {
      const variant = product.variants.find(v => v.id === variantId);
      if (!variant) {
        throw new NotFoundException('Variant not found');
      }
      if (variant.stockQuantity < quantity) {
        throw new BadRequestException('Insufficient stock');
      }
      price = variant.price;
    }

    // Check if item already in cart
    const existingItem = await this.cartItemsRepository.findOne({
      where: { userId, productId, variantId: variantId ?? undefined },
    });

    if (existingItem) {
      // Update quantity
      existingItem.quantity += quantity;
      return await this.cartItemsRepository.save(existingItem);
    }

    // Create new cart item
    const cartItem = this.cartItemsRepository.create({
      userId,
      productId,
      variantId,
      quantity,
      price,
    });

    return await this.cartItemsRepository.save(cartItem);
  }

  async getCart(userId: string) {
    const items = await this.cartItemsRepository.find({
      where: { userId },
      relations: ['product', 'product.category', 'variant'],
      order: { createdAt: 'DESC' },
    });

    // Calculate summary
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * 0.1; // 10% tax (configurable)
    const shippingCost = subtotal >= 100 ? 0 : 10; // Free shipping over $100

    return {
      items,
      summary: {
        itemsCount: items.length,
        totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        shippingCost,
        discount: 0,
        total: parseFloat((subtotal + tax + shippingCost).toFixed(2)),
      },
    };
  }

  async updateCartItem(
    userId: string,
    itemId: string,
    updateDto: UpdateCartItemDto,
  ): Promise<CartItem> {
    const item = await this.cartItemsRepository.findOne({
      where: { id: itemId, userId },
      relations: ['product', 'variant'],
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    // Check stock
    if (item.variant && item.variant.stockQuantity < updateDto.quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    item.quantity = updateDto.quantity;
    return await this.cartItemsRepository.save(item);
  }

  async removeFromCart(userId: string, itemId: string): Promise<void> {
    const item = await this.cartItemsRepository.findOne({
      where: { id: itemId, userId },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.cartItemsRepository.remove(item);
  }

  async clearCart(userId: string): Promise<void> {
    await this.cartItemsRepository.delete({ userId });
  }

  async applyCoupon(userId: string, couponCode: string) {
    const cart = await this.getCart(userId);

    // Validate coupon
    const offer = await this.offersService.findByCouponCode(couponCode);

    // Calculate discount
    let discount = 0;
    const subtotal = cart.summary.subtotal;

    if (offer.minPurchaseAmount && subtotal < offer.minPurchaseAmount) {
      throw new BadRequestException(`Minimum purchase of $${offer.minPurchaseAmount} required`);
    }

    discount = this.offersService.calculateDiscount(offer, subtotal, 1);

    const total = subtotal + cart.summary.tax + cart.summary.shippingCost - discount;

    return {
      ...cart,
      summary: {
        ...cart.summary,
        discount: parseFloat(discount.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
      },
      appliedOffer: {
        id: offer.id,
        code: offer.couponCode,
        title: offer.title,
        discount: parseFloat(discount.toFixed(2)),
      },
    };
  }
}
