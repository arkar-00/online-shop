// app.module.ts
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DataSource } from 'typeorm';

@Module({
  imports: [
    // Load .env first (make globally available)
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Initialize TypeORM after env is loaded
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DB_HOST, // use the full connection string
      autoLoadEntities: true,
      entities: [],
      synchronize: true, // for dev only
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  constructor(private dataSource: DataSource) {
    console.log('Data Source Initialized:', dataSource.driver.database);
    console.log('ENV Loaded:', {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD ? '***hidden***' : 'missing',
      db: process.env.DB_NAME,
    });
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply().forRoutes('*');
  }
}
