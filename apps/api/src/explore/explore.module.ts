import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExploreController } from './explore.controller';
import { ExploreService } from './explore.service';
import { TasksModule } from '../tasks/tasks.module';
import { AuthModule } from '../auth/auth.module';
import { CommentEntity } from '../database/entities/comment.entity';
import { TaskEntity } from '../database/entities/task.entity';
import { FavoriteEntity } from '../database/entities/favorite.entity';

@Module({
  imports: [
    TasksModule,
    AuthModule,
    TypeOrmModule.forFeature([TaskEntity, CommentEntity, FavoriteEntity]),
  ],
  controllers: [ExploreController],
  providers: [ExploreService],
})
export class ExploreModule {}
