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
import { plainToInstance } from 'class-transformer';
import { ReviewResponseDto } from './dto/review-response.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewsRepository: Repository<Review>,
    private productsService: ProductsService,
  ) {}

  async create(userId: string, createReviewDto: CreateReviewDto): Promise<ReviewResponseDto> {
    const { productId } = createReviewDto;

    await this.productsService.findOne(productId);

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
    await this.productsService.updateProductRating(productId);

    // Get review with user data
    const reviewWithUser = await this.reviewsRepository.findOne({
      where: { id: savedReview.id },
      relations: ['user'],
    });

    return plainToInstance(ReviewResponseDto, reviewWithUser, {
      excludeExtraneousValues: true,
    });
  }

  async findByProduct(productId: string): Promise<ReviewResponseDto[]> {
    const reviews = await this.reviewsRepository.find({
      where: { productId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return plainToInstance(ReviewResponseDto, reviews, {
      excludeExtraneousValues: true,
    });
  }

  async findOne(id: string): Promise<ReviewResponseDto> {
    const review = await this.reviewsRepository.findOne({
      where: { id },
      relations: ['user', 'product'],
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return plainToInstance(ReviewResponseDto, review, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    id: string,
    userId: string,
    updateReviewDto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    const review = await this.reviewsRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    Object.assign(review, updateReviewDto);
    const updatedReview = await this.reviewsRepository.save(review);

    await this.productsService.updateProductRating(review.productId);

    return plainToInstance(ReviewResponseDto, updatedReview, {
      excludeExtraneousValues: true,
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    const review = await this.reviewsRepository.findOne({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    const productId = review.productId;
    await this.reviewsRepository.remove(review);

    await this.productsService.updateProductRating(productId);
  }
}
