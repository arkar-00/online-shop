import { IsNotEmpty, IsUUID, IsInt, Min, IsOptional } from 'class-validator';

export class AddToCartDto {
  @IsNotEmpty()
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity: number;
}
