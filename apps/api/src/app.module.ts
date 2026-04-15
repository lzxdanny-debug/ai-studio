import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CreditsModule } from './credits/credits.module';
import { TasksModule } from './tasks/tasks.module';
import { GenerateModule } from './generate/generate.module';
import { ExploreModule } from './explore/explore.module';
import { MountseaModule } from './mountsea/mountsea.module';
import { QueueModule } from './queue/queue.module';
import { UploadModule } from './upload/upload.module';
import { ProjectsModule } from './projects/projects.module';
import { UserKeysModule } from './user-keys/user-keys.module';
import { ChatSessionsModule } from './chat-sessions/chat-sessions.module';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { FeedbackModule } from './feedback/feedback.module';
import { PromptModule } from './prompt/prompt.module';
import { ModelPricingModule } from './model-pricing/model-pricing.module';
import { FavoritesModule } from './favorites/favorites.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: config.get<string>('NODE_ENV') === 'development',
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL', 'redis://localhost:6379');
        const url = new URL(redisUrl);
        return {
          connection: {
            host: url.hostname,
            port: parseInt(url.port || '6379'),
            password: url.password || undefined,
          },
        };
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    AuthModule,
    UsersModule,
    CreditsModule,
    TasksModule,
    GenerateModule,
    ExploreModule,
    MountseaModule,
    QueueModule,
    UploadModule,
    ProjectsModule,
    UserKeysModule,
    ChatSessionsModule,
    AdminModule,
    AnalyticsModule,
    FeedbackModule,
    PromptModule,
    ModelPricingModule,
    FavoritesModule,
  ],
})
export class AppModule {}
