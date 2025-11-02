import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto, SortBy } from './dto/product-filter.dto';
import slugify from 'slugify';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private variantsRepository: Repository<ProductVariant>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const slug = slugify(createProductDto.name, { lower: true, strict: true });

    const product = this.productsRepository.create({
      ...createProductDto,
      slug,
    });

    return await this.productsRepository.save(product);
  }

  async findAll(filterDto: ProductFilterDto) {
    const {
      keyword,
      categoryId,
      minPrice,
      maxPrice,
      minRating,
      sortBy = SortBy.NEWEST,
      page = 1,
      limit = 12,
    } = filterDto;

    const queryBuilder = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.variants', 'variants')
      .where('product.isActive = :isActive', { isActive: true });

    if (keyword) {
      queryBuilder.andWhere('(product.name ILIKE :keyword OR product.description ILIKE :keyword)', {
        keyword: `%${keyword}%`,
      });
    }

    if (categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    if (minPrice !== undefined && maxPrice !== undefined) {
      queryBuilder.andWhere('product.basePrice BETWEEN :minPrice AND :maxPrice', {
        minPrice,
        maxPrice,
      });
    } else if (minPrice !== undefined) {
      queryBuilder.andWhere('product.basePrice >= :minPrice', { minPrice });
    } else if (maxPrice !== undefined) {
      queryBuilder.andWhere('product.basePrice <= :maxPrice', { maxPrice });
    }

    if (minRating) {
      queryBuilder.andWhere('product.averageRating >= :minRating', { minRating });
    }

    switch (sortBy) {
      case SortBy.PRICE_LOW_HIGH:
        queryBuilder.orderBy('product.basePrice', 'ASC');
        break;
      case SortBy.PRICE_HIGH_LOW:
        queryBuilder.orderBy('product.basePrice', 'DESC');
        break;
      case SortBy.POPULARITY:
        queryBuilder.orderBy('product.salesCount', 'DESC');
        break;
      case SortBy.RATING:
        queryBuilder.orderBy('product.averageRating', 'DESC');
        break;
      case SortBy.NEWEST:
      default:
        queryBuilder.orderBy('product.createdAt', 'DESC');
    }

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [products, total] = await queryBuilder.getManyAndCount();

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.variants', 'variants')
      .leftJoinAndSelect('product.reviews', 'reviews')
      .leftJoinAndSelect('reviews.user', 'user')
      .select([
        'product',
        'category',
        'variants',
        'reviews.id',
        'reviews.rating',
        'reviews.comment',
        'reviews.isVerifiedPurchase',
        'reviews.createdAt',
        // Only specific user fields in reviews
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
      ])
      .where('product.id = :id', { id })
      .getOne();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.productsRepository.increment({ id }, 'viewCount', 1);

    return product;
  }

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.variants', 'variants')
      .leftJoinAndSelect('product.reviews', 'reviews')
      .leftJoinAndSelect('reviews.user', 'user')
      .select([
        'product',
        'category',
        'variants',
        'reviews.id',
        'reviews.rating',
        'reviews.comment',
        'reviews.isVerifiedPurchase',
        'reviews.createdAt',
        // Only specific user fields in reviews
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
      ])
      .where('product.slug = :slug', { slug })
      .getOne();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.productsRepository.increment({ id: product.id }, 'viewCount', 1);

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    if (updateProductDto.name && updateProductDto.name !== product.name) {
      const slug = slugify(updateProductDto.name, { lower: true, strict: true });
      updateProductDto['slug'] = slug;
    }

    Object.assign(product, updateProductDto);
    return await this.productsRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productsRepository.remove(product);
  }

  async updateVariantStock(variantId: string, quantity: number): Promise<ProductVariant> {
    const variant = await this.variantsRepository.findOne({
      where: { id: variantId },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    variant.stockQuantity = quantity;
    return await this.variantsRepository.save(variant);
  }

  async getFeaturedProducts(limit: number = 8): Promise<Product[]> {
    return await this.productsRepository.find({
      where: { isFeatured: true, isActive: true },
      relations: ['category', 'variants'],
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }

  async updateProductRating(productId: string): Promise<void> {
    const result = await this.productsRepository
      .createQueryBuilder('product')
      .leftJoin('product.reviews', 'review')
      .select('AVG(review.rating)', 'avgRating')
      .addSelect('COUNT(review.id)', 'reviewCount')
      .where('product.id = :productId', { productId })
      .getRawOne();

    await this.productsRepository.update(productId, {
      averageRating: parseFloat(result.avgRating) || 0,
      reviewCount: parseInt(result.reviewCount) || 0,
    });
  }
}
