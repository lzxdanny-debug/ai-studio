import { Module } from '@nestjs/common';
import { MountseaService } from './mountsea.service';
import { MountseaSoraService } from './services/sora.service';
import { MountseaGeminiService } from './services/gemini.service';
import { MountseaSunoService } from './services/suno.service';
import { MountseaProducerService } from './services/producer.service';
import { MountseaXaiService } from './services/xai.service';
import { MountseaChatService } from './services/chat.service';

@Module({
  providers: [
    MountseaService,
    MountseaSoraService,
    MountseaGeminiService,
    MountseaSunoService,
    MountseaProducerService,
    MountseaXaiService,
    MountseaChatService,
  ],
  exports: [
    MountseaService,
    MountseaSoraService,
    MountseaGeminiService,
    MountseaSunoService,
    MountseaProducerService,
    MountseaXaiService,
    MountseaChatService,
  ],
})
export class MountseaModule {}
