import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  // ✅ AUTHENTICATED: Get user's wishlist
  @Get()
  async getWishlist(@Request() req) {
    return this.wishlistService.getWishlist(req.user.userId);
  }

  // ✅ AUTHENTICATED: Add product to wishlist
  @Post()
  async addToWishlist(@Request() req, @Body() addToWishlistDto: AddToWishlistDto) {
    return this.wishlistService.addToWishlist(req.user.userId, addToWishlistDto);
  }

  // ✅ AUTHENTICATED: Remove product from wishlist
  @Delete(':productId')
  async removeFromWishlist(@Request() req, @Param('productId') productId: string) {
    await this.wishlistService.removeFromWishlist(req.user.userId, productId);
    return { message: 'Product removed from wishlist' };
  }

  // ✅ AUTHENTICATED: Clear entire wishlist
  @Delete()
  async clearWishlist(@Request() req) {
    await this.wishlistService.clearWishlist(req.user.userId);
    return { message: 'Wishlist cleared successfully' };
  }
}
