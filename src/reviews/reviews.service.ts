import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ProductsService } from '../products/products.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewsRepository: Repository<Review>,
    private productsService: ProductsService,
  ) {}

  async create(userId: string, createReviewDto: CreateReviewDto): Promise<Review> {
    const { productId } = createReviewDto;

    // Check if product exists
    await this.productsService.findOne(productId);

    // Check if user already reviewed this product
    const existingReview = await this.reviewsRepository.findOne({
      where: { userId, productId },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this product');
    }

    const review = this.reviewsRepository.create({
      ...createReviewDto,
      userId,
    });

    const savedReview = await this.reviewsRepository.save(review);

    // Update product rating
    await this.productsService.updateProductRating(productId);

    return savedReview;
  }

  async findByProduct(productId: string): Promise<Review[]> {
    return await this.reviewsRepository.find({
      where: { productId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Review> {
    const review = await this.reviewsRepository.findOne({
      where: { id },
      relations: ['user', 'product'],
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  async update(id: string, userId: string, updateReviewDto: UpdateReviewDto): Promise<Review> {
    const review = await this.findOne(id);

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    Object.assign(review, updateReviewDto);
    const updatedReview = await this.reviewsRepository.save(review);

    // Update product rating
    await this.productsService.updateProductRating(review.productId);

    return updatedReview;
  }

  async remove(id: string, userId: string): Promise<void> {
    const review = await this.findOne(id);

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    const productId = review.productId;
    await this.reviewsRepository.remove(review);

    // Update product rating
    await this.productsService.updateProductRating(productId);
  }
}
