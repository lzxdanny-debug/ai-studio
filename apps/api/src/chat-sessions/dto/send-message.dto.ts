import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MessageItemDto {
  @ApiProperty({ enum: ['user', 'assistant', 'system'] })
  @IsString()
  role: 'user' | 'assistant' | 'system';

  @ApiProperty()
  @IsString()
  content: string;
}

export class SendMessageDto {
  /** 完整消息历史（含最新这条 user 消息） */
  @ApiProperty({ type: [MessageItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageItemDto)
  messages: MessageItemDto[];

  @ApiPropertyOptional({ description: '覆盖会话默认模型' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: '用户 API Key' })
  @IsOptional()
  @IsString()
  apiKey?: string;
}
