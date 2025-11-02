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
} from '@nestjs/common';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { OfferFilterDto } from './dto/offer-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  // ✅ PUBLIC: Get featured offers for home page
  @Get('featured')
  async getFeatured(@Query('limit') limit?: number) {
    return this.offersService.findFeatured(limit ? +limit : 6);
  }

  // ✅ PUBLIC: Get all active offers
  @Get('active')
  async getActive() {
    return this.offersService.findActive();
  }

  // ✅ PUBLIC: Get all offers with filters
  @Get()
  async findAll(@Query() filterDto: OfferFilterDto) {
    return this.offersService.findAll(filterDto);
  }

  // ✅ PUBLIC: Get offer by slug
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.offersService.findBySlug(slug);
  }

  // ✅ PUBLIC: Validate coupon code
  @Get('coupon/:code')
  async validateCoupon(@Param('code') code: string) {
    return this.offersService.findByCouponCode(code);
  }

  // ✅ PUBLIC: Get offer by ID
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.offersService.findOne(id);
  }

  // ✅ ADMIN ONLY: Create offer
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() createOfferDto: CreateOfferDto) {
    return this.offersService.create(createOfferDto);
  }

  // ✅ ADMIN ONLY: Update offer
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() updateOfferDto: UpdateOfferDto) {
    return this.offersService.update(id, updateOfferDto);
  }

  // ✅ ADMIN ONLY: Delete offer
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    await this.offersService.remove(id);
    return { message: 'Offer deleted successfully' };
  }

  // ✅ ADMIN ONLY: Update expired offers (manual trigger)
  @Post('update-expired')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateExpired() {
    await this.offersService.updateExpiredOffers();
    return { message: 'Expired offers updated' };
  }
}
