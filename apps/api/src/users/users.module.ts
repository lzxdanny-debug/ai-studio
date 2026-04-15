import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../database/entities/user.entity';
import { UserCreditEntity } from '../database/entities/user-credit.entity';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, UserCreditEntity])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
