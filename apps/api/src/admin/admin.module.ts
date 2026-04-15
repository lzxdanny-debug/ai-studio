import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../database/entities/user.entity';
import { TaskEntity } from '../database/entities/task.entity';
import { CommentEntity } from '../database/entities/comment.entity';
import { UserCreditEntity } from '../database/entities/user-credit.entity';
import { CreditTransactionEntity } from '../database/entities/credit-transaction.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      TaskEntity,
      CommentEntity,
      UserCreditEntity,
      CreditTransactionEntity,
    ]),
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
