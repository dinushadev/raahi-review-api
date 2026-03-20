import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsModule } from './reviews/reviews.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { ProviderReview } from './database/entities/provider-review.entity';
import { TravelerReview } from './database/entities/traveler-review.entity';
import { ReviewReply } from './database/entities/review-reply.entity';
import { UserContextMiddleware } from './common/middleware/user-context.middleware';
import { RepliesModule } from './replies/replies.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        schema: process.env.DATABASE_SCHEMA ?? 'reviewdb',
        entities: [ProviderReview, TravelerReview, ReviewReply],
        synchronize: false,
        logging: process.env.NODE_ENV === 'development',
        ssl: process.env.DATABASE_SSL !== 'false' ? { rejectUnauthorized: false } : false,
      }),
    }),
    ReviewsModule,
    AdminModule,
    HealthModule,
    RepliesModule
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(UserContextMiddleware).forRoutes('*');
  }
}
