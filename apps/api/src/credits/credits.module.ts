import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { UserCreditEntity } from '../database/entities/user-credit.entity';
import { CreditTransactionEntity } from '../database/entities/credit-transaction.entity';
import { CreditsService } from './credits.service';
import { CreditsController } from './credits.controller';
import { RedisService } from '../auth/redis.service';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([UserCreditEntity, CreditTransactionEntity]),
  ],
  providers: [CreditsService, RedisService],
  controllers: [CreditsController],
  exports: [CreditsService],
})
export class CreditsModule {}
