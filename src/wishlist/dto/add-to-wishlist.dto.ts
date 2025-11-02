import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddToWishlistDto {
  @IsNotEmpty()
  @IsUUID()
  productId: string;
}