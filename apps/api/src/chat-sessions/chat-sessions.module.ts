import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatSessionEntity } from '../database/entities/chat-session.entity';
import { ChatMessageEntity } from '../database/entities/chat-message.entity';
import { ChatSessionsService } from './chat-sessions.service';
import { ChatSessionsController } from './chat-sessions.controller';
import { MountseaModule } from '../mountsea/mountsea.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatSessionEntity, ChatMessageEntity]),
    MountseaModule,
  ],
  providers: [ChatSessionsService],
  controllers: [ChatSessionsController],
})
export class ChatSessionsModule {}
