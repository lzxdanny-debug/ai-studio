import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UserKeysController } from './user-keys.controller';
import { RedisService } from '../auth/redis.service';

@Module({
  imports: [HttpModule],
  controllers: [UserKeysController],
  providers: [RedisService],
})
export class UserKeysModule {}
