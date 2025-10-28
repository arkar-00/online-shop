import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WishlistItem } from './entities/wishlist-item.entity';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';
import { ProductsService } from '../products/products.service';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(WishlistItem)
    private wishlistRepository: Repository<WishlistItem>,
    private productsService: ProductsService,
  ) {}

  async addToWishlist(userId: string, addToWishlistDto: AddToWishlistDto): Promise<WishlistItem> {
    const { productId } = addToWishlistDto;

    // Check if product exists
    await this.productsService.findOne(productId);

    // Check if already in wishlist
    const existing = await this.wishlistRepository.findOne({
      where: { userId, productId },
    });

    if (existing) {
      throw new ConflictException('Product already in wishlist');
    }

    const wishlistItem = this.wishlistRepository.create({
      userId,
      productId,
    });

    return await this.wishlistRepository.save(wishlistItem);
  }

  async getWishlist(userId: string): Promise<WishlistItem[]> {
    return await this.wishlistRepository.find({
      where: { userId },
      relations: ['product', 'product.category', 'product.variants'],
      order: { createdAt: 'DESC' },
    });
  }

  async removeFromWishlist(userId: string, productId: string): Promise<void> {
    const wishlistItem = await this.wishlistRepository.findOne({
      where: { userId, productId },
    });

    if (!wishlistItem) {
      throw new NotFoundException('Item not found in wishlist');
    }

    await this.wishlistRepository.remove(wishlistItem);
  }

  async clearWishlist(userId: string): Promise<void> {
    await this.wishlistRepository.delete({ userId });
  }
}
