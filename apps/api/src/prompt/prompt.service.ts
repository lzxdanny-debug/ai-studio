import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { MountseaChatService } from '../mountsea/services/chat.service';
import { EnhancePromptDto, PromptType } from './dto/enhance-prompt.dto';

const SYSTEM_PROMPTS: Record<PromptType, string> = {
  video: `You are an expert AI video generation prompt engineer.
Your task is to take a user's simple description and rewrite it into 3 high-quality prompts optimized for AI video models like Sora, Veo, and Runway.

Rules:
- Each prompt should be 1-3 sentences, rich in visual detail
- Include: subject, action, setting, lighting, camera angle, mood, style
- IMPORTANT: Detect the language of the user's input and respond in the SAME language. If the user writes in Chinese, respond in Chinese. If English, respond in English.
- Make prompts cinematic and vivid
- Return ONLY a JSON array of exactly 3 strings, no other text

Example output (Chinese input): ["方案1内容", "方案2内容", "方案3内容"]
Example output (English input): ["Prompt 1 here", "Prompt 2 here", "Prompt 3 here"]`,

  image: `You are an expert AI image generation prompt engineer.
Your task is to take a user's simple description and rewrite it into 3 high-quality prompts optimized for AI image models like Midjourney, DALL-E, and Stable Diffusion.

Rules:
- Each prompt should include: subject, style, lighting, color palette, composition, mood, art medium
- For Chinese output: add quality tags in Chinese like "超高清、8K画质、精细细节、大师级构图"
- For English output: append tags like "masterpiece, best quality, highly detailed, 8k"
- IMPORTANT: Detect the language of the user's input and respond in the SAME language. If the user writes in Chinese, respond in Chinese. If English, respond in English.
- Make each variant explore a different artistic style or angle
- Return ONLY a JSON array of exactly 3 strings, no other text

Example output (Chinese input): ["方案1内容", "方案2内容", "方案3内容"]
Example output (English input): ["Prompt 1 here", "Prompt 2 here", "Prompt 3 here"]`,

  music: `You are an expert AI music generation prompt engineer.
Your task is to take a user's simple description and rewrite it into 3 high-quality prompts optimized for AI music models like Suno and Udio.

Rules:
- Each prompt should include: genre, instruments, tempo, mood, energy level, vocal style (if any)
- Be specific about musical elements (BPM range, key, time signature if relevant)
- IMPORTANT: Detect the language of the user's input and respond in the SAME language. If the user writes in Chinese, respond in Chinese. If English, respond in English.
- Make each variant explore a different musical interpretation
- Return ONLY a JSON array of exactly 3 strings, no other text

Example output (Chinese input): ["方案1内容", "方案2内容", "方案3内容"]
Example output (English input): ["Prompt 1 here", "Prompt 2 here", "Prompt 3 here"]`,
};

@Injectable()
export class PromptService {
  private readonly logger = new Logger(PromptService.name);

  constructor(private readonly chatService: MountseaChatService) {}

  async enhance(dto: EnhancePromptDto): Promise<{ variants: string[] }> {
    const systemPrompt = SYSTEM_PROMPTS[dto.type];

    this.logger.log(`Enhancing ${dto.type} prompt: "${dto.prompt.slice(0, 50)}..."`);

    let content: string;
    try {
      const result = await this.chatService.chatCompletions(
        'claude-haiku-4-5-20251001',
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: dto.prompt },
        ],
        dto.apiKey,
        90000,
      );
      content = result.content;
    } catch (err: any) {
      const status = err?.response?.status ?? err?.status;
      const isTimeout = err?.code === 'ECONNABORTED' || err?.message?.includes('timeout');
      if (status === 402) {
        throw new HttpException(
          'API Key 积分不足，请前往 Mountsea 控制台充值或选择其他 Key',
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
      if (isTimeout) {
        throw new HttpException(
          'AI 服务响应超时，请稍后重试',
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }
      throw new HttpException(
        err?.message || '调用 AI 服务失败，请稍后重试',
        HttpStatus.BAD_GATEWAY,
      );
    }

    let variants: string[] = [];
    try {
      // Extract JSON array from the response (handles cases where model adds extra text)
      const match = content.match(/\[[\s\S]*\]/);
      if (match) {
        variants = JSON.parse(match[0]);
      }
    } catch {
      this.logger.warn('Failed to parse enhanced prompts JSON, returning raw content');
    }

    // Fallback: if parsing failed, split by newlines
    if (!variants.length) {
      variants = content
        .split('\n')
        .map((l) => l.replace(/^\d+\.\s*/, '').trim())
        .filter((l) => l.length > 10)
        .slice(0, 3);
    }

    // Ensure we always return exactly 3 variants
    while (variants.length < 3) {
      variants.push(variants[0] || dto.prompt);
    }
    variants = variants.slice(0, 3);

    return { variants };
  }
}
