import { Exclude, Expose, Type } from 'class-transformer';

export class UserInReviewDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  email: string;

  // Exclude all other fields
  @Exclude()
  password: string;

  @Exclude()
  role: string;

  @Exclude()
  isEmailVerified: boolean;

  @Exclude()
  refreshToken: string;

  @Exclude()
  emailVerificationCode: string;

  @Exclude()
  emailVerificationExpires: Date;

  @Exclude()
  is2FAEnabled: boolean;

  @Exclude()
  twoFACode: string;

  @Exclude()
  twoFAExpires: Date;

  @Exclude()
  resetPasswordToken: string;

  @Exclude()
  resetPasswordExpires: Date;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;
}

export class ReviewResponseDto {
  @Expose()
  id: string;

  @Expose()
  rating: number;

  @Expose()
  comment: string;

  @Expose()
  isVerifiedPurchase: boolean;

  @Expose()
  productId: string;

  @Expose()
  userId: string;

  @Expose()
  @Type(() => UserInReviewDto)
  user: UserInReviewDto;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
