import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { VideoGenerateController } from './video/video-generate.controller';
import { VideoGenerateService } from './video/video-generate.service';
import { ImageGenerateController } from './image/image-generate.controller';
import { ImageGenerateService } from './image/image-generate.service';
import { MusicGenerateController } from './music/music-generate.controller';
import { MusicGenerateService } from './music/music-generate.service';
import { ChatGenerateController } from './chat/chat-generate.controller';
import { ChatGenerateService } from './chat/chat-generate.service';
import { TasksModule } from '../tasks/tasks.module';
import { CreditsModule } from '../credits/credits.module';
import { MountseaModule } from '../mountsea/mountsea.module';
import { TASK_POLLING_QUEUE } from '../queue/queue.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: TASK_POLLING_QUEUE }),
    TasksModule,
    CreditsModule,
    MountseaModule,
  ],
  controllers: [
    VideoGenerateController,
    ImageGenerateController,
    MusicGenerateController,
    ChatGenerateController,
  ],
  providers: [
    VideoGenerateService,
    ImageGenerateService,
    MusicGenerateService,
    ChatGenerateService,
  ],
})
export class GenerateModule {}
