import { IsEnum, IsString, IsOptional, IsBoolean, IsArray, IsNumber, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VideoModel, VideoSubType } from '@ai-platform/shared';

export class CreateVideoDto {
  @ApiProperty({ enum: VideoModel })
  @IsEnum(VideoModel)
  model: VideoModel;

  @ApiProperty({ enum: VideoSubType })
  @IsEnum(VideoSubType)
  subType: VideoSubType;

  @ApiProperty({ example: 'A futuristic cityscape at dusk with flying cars' })
  @IsString()
  @MaxLength(2000)
  prompt: string;

  @ApiPropertyOptional({ type: [String], description: '参考图片 URL 列表（图生视频时必填）' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiPropertyOptional({ description: '视频时长（秒）', enum: [10, 15] })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({ description: '画面比例', example: '16:9' })
  @IsOptional()
  @IsString()
  aspectRatio?: string;

  @ApiPropertyOptional({ description: '分辨率', example: '720p' })
  @IsOptional()
  @IsString()
  resolution?: string;

  @ApiPropertyOptional({ description: '是否公开到社区探索页' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: '使用指定的 shanhaiapi.com API Key（不填则使用平台默认 Key）' })
  @IsOptional()
  @IsString()
  apiKey?: string;
}
