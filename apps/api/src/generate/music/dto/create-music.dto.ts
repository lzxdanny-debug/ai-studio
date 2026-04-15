import { IsEnum, IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MusicModel } from '@ai-platform/shared';

export class CreateMusicDto {
  @ApiProperty({ enum: MusicModel })
  @IsEnum(MusicModel)
  model: MusicModel;

  @ApiPropertyOptional({ description: '音乐风格/描述', example: 'energetic pop with electric guitar' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  prompt?: string;

  @ApiPropertyOptional({ description: '歌词内容', example: '[Verse]\nHello world...\n\n[Chorus]\nLa la la...' })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  lyrics?: string;

  @ApiPropertyOptional({ description: '歌曲标题' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @ApiPropertyOptional({ description: '风格标签（Suno）', example: 'Pop, Happy, Upbeat' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tags?: string;

  @ApiPropertyOptional({ description: '是否纯音乐（无人声）' })
  @IsOptional()
  @IsBoolean()
  makeInstrumental?: boolean;

  @ApiPropertyOptional({ description: '是否公开到社区' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: '使用指定的 shanhaiapi.com API Key' })
  @IsOptional()
  @IsString()
  apiKey?: string;
}

export class GenerateLyricsDto {
  @ApiProperty({ description: '歌词主题/描述' })
  @IsString()
  @MaxLength(500)
  prompt: string;
}
