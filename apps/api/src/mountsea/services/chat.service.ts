import { Injectable, Logger } from '@nestjs/common';
import { MountseaService } from '../mountsea.service';
import { ChatMessage } from '@ai-platform/shared';

@Injectable()
export class MountseaChatService {
  private readonly logger = new Logger(MountseaChatService.name);

  constructor(private mountsea: MountseaService) {}

  async chatCompletions(
    model: string,
    messages: ChatMessage[],
    userApiKey?: string,
    timeoutMs?: number,
  ): Promise<{ content: string; tokensUsed: number }> {
    const client = this.mountsea.getClient(userApiKey);
    const response = await client.post(
      '/chat/chat/completions',
      { model, messages },
      timeoutMs ? { timeout: timeoutMs } : undefined,
    );
    const data = response.data;
    return {
      content: data.choices?.[0]?.message?.content || '',
      tokensUsed: data.usage?.total_tokens || 0,
    };
  }

  async *streamChatCompletions(
    model: string,
    messages: ChatMessage[],
    userApiKey?: string,
  ): AsyncGenerator<string> {
    this.logger.log(`Calling Mountsea stream: model=${model}`);

    const client = this.mountsea.getClient(userApiKey);
    let response: any;
    try {
      response = await client.post(
        '/chat/chat/completions',
        { model, messages, stream: true },
        { responseType: 'stream', timeout: 120000 },
      );
    } catch (err: any) {
      // 错误拦截器已读取并记录流错误体，这里直接用更友好的提示重新抛出
      const status = err?.response?.status;
      throw new Error(`Mountsea API 返回错误 ${status ?? ''}，请检查 API Key 或模型名称`);
    }

    this.logger.log(`Mountsea stream connected, status=${response.status}`);

    const stream = response.data;
    let buffer = '';

    for await (const chunk of stream) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch {
            // ignore parse errors
          }
        }
      }
    }

    // 处理 buffer 里最后一行
    if (buffer.startsWith('data: ')) {
      const data = buffer.slice(6).trim();
      if (data !== '[DONE]') {
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {}
      }
    }
  }
}
