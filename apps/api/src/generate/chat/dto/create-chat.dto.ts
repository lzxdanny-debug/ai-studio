import { IsArray, IsBoolean, IsOptional, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatModel, ChatMessage } from '@ai-platform/shared';

export class ChatMessageDto implements ChatMessage {
  @ApiProperty({ enum: ['user', 'assistant', 'system'] })
  @IsString()
  role: 'user' | 'assistant' | 'system';

  @ApiProperty()
  @IsString()
  content: string;
}

export class CreateChatDto {
  @ApiProperty({ description: '模型名称，如 gpt-5.1、claude-sonnet-4-6 等' })
  @IsString()
  model: string;

  @ApiProperty({ type: [ChatMessageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @ApiPropertyOptional({ description: '是否流式输出' })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @ApiPropertyOptional({ description: '用户自己的 shanhaiapi.com API Key' })
  @IsOptional()
  @IsString()
  apiKey?: string;
}
