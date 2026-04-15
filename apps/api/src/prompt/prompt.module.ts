import { Module } from '@nestjs/common';
import { MountseaModule } from '../mountsea/mountsea.module';
import { PromptController } from './prompt.controller';
import { PromptService } from './prompt.service';

@Module({
  imports: [MountseaModule],
  controllers: [PromptController],
  providers: [PromptService],
})
export class PromptModule {}
