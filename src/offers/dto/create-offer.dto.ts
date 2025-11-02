import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsArray,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { OfferType, OfferStatus } from '../entities/offer.entity';

export class CreateOfferDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsEnum(OfferType)
  type: OfferType;

  @IsOptional()
  @IsEnum(OfferStatus)
  status?: OfferStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  buyQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  getQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPurchaseAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  bannerImage?: string;

  @IsOptional()
  @IsString()
  badgeText?: string;

  @IsOptional()
  @IsString()
  badgeColor?: string;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  showCountdown?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  perUserLimit?: number;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableCategoryIds?: string[];
}
