import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, Between } from 'typeorm';
import { Offer, OfferStatus } from './entities/offer.entity';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { OfferFilterDto } from './dto/offer-filter.dto';
import slugify from 'slugify';

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(Offer)
    private offersRepository: Repository<Offer>,
  ) {}

  async create(createOfferDto: CreateOfferDto): Promise<Offer> {
    const slug = slugify(createOfferDto.title, { lower: true, strict: true });

    // Validate dates
    const startDate = new Date(createOfferDto.startDate);
    const endDate = new Date(createOfferDto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Auto-set status based on dates
    const now = new Date();
    let status = createOfferDto.status || OfferStatus.DRAFT;

    if (status !== OfferStatus.DRAFT && status !== OfferStatus.PAUSED) {
      if (now < startDate) {
        status = OfferStatus.SCHEDULED;
      } else if (now >= startDate && now <= endDate) {
        status = OfferStatus.ACTIVE;
      } else {
        status = OfferStatus.EXPIRED;
      }
    }

    const offer = this.offersRepository.create({
      ...createOfferDto,
      slug,
      startDate,
      endDate,
      status,
    });

    return await this.offersRepository.save(offer);
  }

  async findAll(filterDto?: OfferFilterDto): Promise<Offer[]> {
    const queryBuilder = this.offersRepository
      .createQueryBuilder('offer')
      .leftJoinAndSelect('offer.product', 'product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.variants', 'variants');

    if (filterDto?.type) {
      queryBuilder.andWhere('offer.type = :type', { type: filterDto.type });
    }

    if (filterDto?.status) {
      queryBuilder.andWhere('offer.status = :status', { status: filterDto.status });
    }

    if (filterDto?.isFeatured !== undefined) {
      queryBuilder.andWhere('offer.isFeatured = :isFeatured', {
        isFeatured: filterDto.isFeatured,
      });
    }

    if (filterDto?.activeOnly) {
      const now = new Date();
      queryBuilder
        .andWhere('offer.status = :status', { status: OfferStatus.ACTIVE })
        .andWhere('offer.startDate <= :now', { now })
        .andWhere('offer.endDate >= :now', { now })
        .andWhere('offer.isActive = :isActive', { isActive: true });
    }

    queryBuilder.orderBy('offer.priority', 'DESC').addOrderBy('offer.createdAt', 'DESC');

    return await queryBuilder.getMany();
  }

  async findFeatured(limit: number = 6): Promise<Offer[]> {
    const now = new Date();

    return await this.offersRepository.find({
      where: {
        isFeatured: true,
        status: OfferStatus.ACTIVE,
        isActive: true,
        startDate: LessThanOrEqual(now),
        endDate: MoreThanOrEqual(now),
      },
      relations: ['product', 'product.category', 'product.variants'],
      order: { priority: 'DESC', createdAt: 'DESC' },
      take: limit,
    });
  }

  async findActive(): Promise<Offer[]> {
    const now = new Date();

    return await this.offersRepository.find({
      where: {
        status: OfferStatus.ACTIVE,
        isActive: true,
        startDate: LessThanOrEqual(now),
        endDate: MoreThanOrEqual(now),
      },
      relations: ['product', 'product.category'],
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Offer> {
    const offer = await this.offersRepository.findOne({
      where: { id },
      relations: ['product', 'product.category', 'product.variants'],
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    return offer;
  }

  async findBySlug(slug: string): Promise<Offer> {
    const offer = await this.offersRepository.findOne({
      where: { slug },
      relations: ['product', 'product.category', 'product.variants'],
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    return offer;
  }

  async findByCouponCode(couponCode: string): Promise<Offer> {
    const now = new Date();

    const offer = await this.offersRepository.findOne({
      where: {
        couponCode: couponCode.toUpperCase(),
        status: OfferStatus.ACTIVE,
        isActive: true,
        startDate: LessThanOrEqual(now),
        endDate: MoreThanOrEqual(now),
      },
      relations: ['product'],
    });

    if (!offer) {
      throw new NotFoundException('Invalid or expired coupon code');
    }

    // Check usage limit
    if (offer.usageLimit && offer.usageCount >= offer.usageLimit) {
      throw new BadRequestException('This coupon has reached its usage limit');
    }

    return offer;
  }

  async update(id: string, updateOfferDto: UpdateOfferDto): Promise<Offer> {
    const offer = await this.findOne(id);

    if (updateOfferDto.title && updateOfferDto.title !== offer.title) {
      const slug = slugify(updateOfferDto.title, { lower: true, strict: true });
      updateOfferDto['slug'] = slug;
    }

    // Validate dates if provided
    if (updateOfferDto.startDate || updateOfferDto.endDate) {
      const startDate = updateOfferDto.startDate
        ? new Date(updateOfferDto.startDate)
        : offer.startDate;
      const endDate = updateOfferDto.endDate ? new Date(updateOfferDto.endDate) : offer.endDate;

      if (endDate <= startDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    Object.assign(offer, updateOfferDto);
    return await this.offersRepository.save(offer);
  }

  async remove(id: string): Promise<void> {
    const offer = await this.findOne(id);
    await this.offersRepository.remove(offer);
  }

  async incrementUsageCount(offerId: string): Promise<void> {
    await this.offersRepository.increment({ id: offerId }, 'usageCount', 1);
  }

  async updateExpiredOffers(): Promise<void> {
    const now = new Date();

    await this.offersRepository
      .createQueryBuilder()
      .update(Offer)
      .set({ status: OfferStatus.EXPIRED })
      .where('endDate < :now', { now })
      .andWhere('status != :expired', { expired: OfferStatus.EXPIRED })
      .execute();

    await this.offersRepository
      .createQueryBuilder()
      .update(Offer)
      .set({ status: OfferStatus.ACTIVE })
      .where('startDate <= :now', { now })
      .andWhere('endDate >= :now', { now })
      .andWhere('status = :scheduled', { scheduled: OfferStatus.SCHEDULED })
      .execute();
  }

  calculateDiscount(offer: Offer, originalPrice: number, quantity: number = 1): number {
    let discount = 0;

    switch (offer.type) {
      case 'percentage':
        discount = (originalPrice * offer.discountValue) / 100;
        if (offer.maxDiscountAmount && discount > offer.maxDiscountAmount) {
          discount = offer.maxDiscountAmount;
        }
        break;

      case 'fixed_amount':
        discount = offer.discountValue;
        break;

      case 'buy_x_get_y':
        if (quantity >= offer.buyQuantity) {
          const freeItems = Math.floor(quantity / offer.buyQuantity) * offer.getQuantity;
          discount = (originalPrice / quantity) * freeItems;
        }
        break;

      case 'free_shipping':
        // Shipping discount handled separately
        discount = 0;
        break;

      default:
        discount = 0;
    }

    return Math.min(discount, originalPrice);
  }
}
