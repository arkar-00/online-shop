import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderFilterDto } from './dto/order-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ✅ USER: Create new order from cart
  @Post()
  async createOrder(@Request() req, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(req.user.userId, createOrderDto);
  }

  // ✅ USER: Get my orders (with filters)
  @Get('my-orders')
  async getMyOrders(@Request() req, @Query() filterDto: OrderFilterDto) {
    return this.ordersService.findByUser(req.user.userId, filterDto);
  }

  // ✅ USER: Get single order by ID
  @Get(':id')
  async getOrder(@Request() req, @Param('id') id: string) {
    const order = await this.ordersService.findOne(id);

    // Users can only see their own orders
    if (order.userId !== req.user.userId && req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied');
    }

    return order;
  }

  // ✅ USER: Get order by order number
  @Get('track/:orderNumber')
  async trackOrder(@Request() req, @Param('orderNumber') orderNumber: string) {
    const order = await this.ordersService.findByOrderNumber(orderNumber);

    // Users can only track their own orders
    if (order.userId !== req.user.userId && req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied');
    }

    return order;
  }

  // ✅ USER: Cancel own order
  @Post(':id/cancel')
  async cancelOrder(@Request() req, @Param('id') id: string, @Body('reason') reason?: string) {
    return this.ordersService.cancelOrder(req.user.userId, id, reason);
  }

  // ✅ ADMIN: Get all orders (with filters)
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllOrders(@Query() filterDto: OrderFilterDto) {
    return this.ordersService.findAll(filterDto);
  }

  // ✅ ADMIN: Update order status
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateOrderStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, updateStatusDto, req.user.userId);
  }

  // ✅ ADMIN: Get order statistics
  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getOrderStats() {
    return this.ordersService.getOrderStats();
  }
}
