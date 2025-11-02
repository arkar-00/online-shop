import { IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { OfferType, OfferStatus } from '../entities/offer.entity';
import { Type } from 'class-transformer';

export class OfferFilterDto {
  @IsOptional()
  @IsEnum(OfferType)
  type?: OfferType;

  @IsOptional()
  @IsEnum(OfferStatus)
  status?: OfferStatus;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  activeOnly?: boolean;
}
