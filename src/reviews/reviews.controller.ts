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
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // ✅ PUBLIC: Get all reviews for a product
  @Get('product/:productId')
  async findByProduct(@Param('productId') productId: string) {
    return this.reviewsService.findByProduct(productId);
  }

  // ✅ AUTHENTICATED: Create review
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req, @Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.create(req.user.userId, createReviewDto);
  }

  // ✅ PUBLIC: Get single review
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }

  // ✅ AUTHENTICATED: Update own review
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, req.user.userId, updateReviewDto);
  }

  // ✅ AUTHENTICATED: Delete own review
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Request() req) {
    await this.reviewsService.remove(id, req.user.userId);
    return { message: 'Review deleted successfully' };
  }
}