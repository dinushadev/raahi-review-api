import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsModule } from './reviews/reviews.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { ProviderReview } from './database/entities/provider-review.entity';
import { TravelerReview } from './database/entities/traveler-review.entity';
import { UserContextMiddleware } from './common/middleware/user-context.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        schema: process.env.DATABASE_SCHEMA ?? 'reviewdb',
        entities: [ProviderReview, TravelerReview],
        synchronize: false,
        logging: process.env.NODE_ENV === 'development',
      }),
    }),
    ReviewsModule,
    AdminModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(UserContextMiddleware).forRoutes('*');
  }
}
