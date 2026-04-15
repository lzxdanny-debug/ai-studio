import { Injectable, Logger } from '@nestjs/common';
import { MountseaChatService } from '../../mountsea/services/chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { Response } from 'express';

@Injectable()
export class ChatGenerateService {
  private readonly logger = new Logger(ChatGenerateService.name);

  constructor(private chatService: MountseaChatService) {}

  async chat(dto: CreateChatDto) {
    const result = await this.chatService.chatCompletions(dto.model, dto.messages, dto.apiKey);
    return {
      content: result.content,
      model: dto.model,
      tokensUsed: result.tokensUsed,
    };
  }

  async streamChat(dto: CreateChatDto, response: Response): Promise<void> {
    this.logger.log(`streamChat start — model: ${dto.model}, key: ${dto.apiKey ? '用户Key' : '平台Key'}`);

    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();

    try {
      this.logger.log('calling streamChatCompletions...');
      const generator = this.chatService.streamChatCompletions(dto.model, dto.messages, dto.apiKey);
      let chunkCount = 0;
      for await (const chunk of generator) {
        chunkCount++;
        response.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
      this.logger.log(`streamChat done — ${chunkCount} chunks`);
      response.write('data: [DONE]\n\n');
    } catch (error: any) {
      this.logger.error(`streamChat error: ${error?.message}`, error?.stack);
      const errMsg = error?.response?.data?.error?.message
        || error?.response?.data?.message
        || error?.message
        || '生成失败，请重试';
      response.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`);
    } finally {
      response.end();
    }
  }
}
