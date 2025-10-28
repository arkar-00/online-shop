import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EmailModule } from './email/email.module';
import { CategoriesService } from './categories/categories.service';
import { ProductsService } from './products/products.service';
import { ReviewsService } from './reviews/reviews.service';
import { WishlistService } from './wishlist/wishlist.service';
import { CategoriesController } from './categories/categories.controller';
import { ProductsController } from './products/products.controller';
import { ReviewsController } from './reviews/reviews.controller';
import { WishlistController } from './wishlist/wishlist.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: process.env.DB_HOST, // use the full connection string
        autoLoadEntities: true,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // for dev only
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    EmailModule,
  ],
  providers: [CategoriesService, ProductsService, ReviewsService, WishlistService],
  controllers: [CategoriesController, ProductsController, ReviewsController, WishlistController],
})
export class AppModule {}
