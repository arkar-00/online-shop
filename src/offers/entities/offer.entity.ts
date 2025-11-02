import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

export enum OfferType {
  PERCENTAGE = 'percentage', // 20% off
  FIXED_AMOUNT = 'fixed_amount', // $50 off
  BUY_X_GET_Y = 'buy_x_get_y', // Buy 2 Get 1 Free
  FREE_SHIPPING = 'free_shipping',
  BUNDLE = 'bundle', // Bundle deal
}

export enum OfferStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  SCHEDULED = 'scheduled',
  EXPIRED = 'expired',
  PAUSED = 'paused',
}

@Entity('offers')
export class Offer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ unique: true })
  slug: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: OfferType,
  })
  type: OfferType;

  @Column({
    type: 'enum',
    enum: OfferStatus,
    default: OfferStatus.DRAFT,
  })
  status: OfferStatus;

  // Discount value (percentage or fixed amount)
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  discountValue: number;

  // For Buy X Get Y offers
  @Column({ nullable: true })
  buyQuantity: number;

  @Column({ nullable: true })
  getQuantity: number;

  // Minimum purchase amount
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  minPurchaseAmount: number;

  // Maximum discount cap
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  maxDiscountAmount: number;

  // Offer validity
  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  // Display settings
  @Column({ nullable: true })
  bannerImage: string;

  @Column({ nullable: true })
  badgeText: string; // "HOT DEAL", "LIMITED TIME", etc.

  @Column({ nullable: true })
  badgeColor: string; // "#FF0000"

  @Column({ default: false })
  isFeatured: boolean; // Show on home page

  @Column({ default: true })
  showCountdown: boolean;

  @Column({ default: 0 })
  priority: number; // For sorting (higher = shown first)

  // Usage limits
  @Column({ nullable: true })
  usageLimit: number; // Total usage limit

  @Column({ default: 0 })
  usageCount: number; // Current usage count

  @Column({ nullable: true })
  perUserLimit: number; // Limit per user

  // Coupon code (optional)
  @Column({ unique: true, nullable: true })
  couponCode: string;

  // Related product (optional)
  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ nullable: true })
  productId: string;

  // Categories this offer applies to (stored as comma-separated IDs)
  @Column('simple-array', { nullable: true })
  applicableCategoryIds: string[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
