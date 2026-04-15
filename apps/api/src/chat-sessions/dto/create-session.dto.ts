import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiPropertyOptional({ description: '初始模型，默认 gpt-5.1' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: '会话标题，留空则由首条消息自动生成' })
  @IsOptional()
  @IsString()
  title?: string;
}
