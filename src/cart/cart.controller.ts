import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // ✅ Get user's cart with summary
  @Get()
  async getCart(@Request() req) {
    return this.cartService.getCart(req.user.userId);
  }

  // ✅ Add item to cart
  @Post('items')
  async addToCart(@Request() req, @Body() addToCartDto: AddToCartDto) {
    return this.cartService.addToCart(req.user.userId, addToCartDto);
  }

  // ✅ Update cart item quantity
  @Patch('items/:itemId')
  async updateCartItem(
    @Request() req,
    @Param('itemId') itemId: string,
    @Body() updateDto: UpdateCartItemDto,
  ) {
    return this.cartService.updateCartItem(req.user.userId, itemId, updateDto);
  }

  // ✅ Remove item from cart
  @Delete('items/:itemId')
  async removeFromCart(@Request() req, @Param('itemId') itemId: string) {
    await this.cartService.removeFromCart(req.user.userId, itemId);
    return { message: 'Item removed from cart' };
  }

  // ✅ Clear entire cart
  @Delete()
  async clearCart(@Request() req) {
    await this.cartService.clearCart(req.user.userId);
    return { message: 'Cart cleared successfully' };
  }

  // ✅ Apply coupon/discount code
  @Post('apply-coupon')
  async applyCoupon(@Request() req, @Body('couponCode') couponCode: string) {
    return this.cartService.applyCoupon(req.user.userId, couponCode);
  }
}
