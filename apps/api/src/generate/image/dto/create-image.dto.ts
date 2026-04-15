import { IsEnum, IsString, IsOptional, IsBoolean, IsNumber, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ImageModel, ImageSubType } from '@ai-platform/shared';

export class CreateImageDto {
  @ApiProperty({ enum: ImageModel })
  @IsEnum(ImageModel)
  model: ImageModel;

  @ApiProperty({ enum: ImageSubType })
  @IsEnum(ImageSubType)
  subType: ImageSubType;

  @ApiProperty({ example: 'A majestic mountain landscape at golden hour' })
  @IsString()
  @MaxLength(2000)
  prompt: string;

  @ApiPropertyOptional({ description: '参考图片 URL（图生图时使用）' })
  @IsOptional()
  @IsString()
  referenceImageUrl?: string;

  @ApiPropertyOptional({ description: '画面比例', example: '1:1' })
  @IsOptional()
  @IsString()
  aspectRatio?: string;

  @ApiPropertyOptional({ description: '输出图片数量', minimum: 1, maximum: 4 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  outputNumber?: number;

  @ApiPropertyOptional({ description: '是否公开到社区' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: '使用指定的 shanhaiapi.com API Key' })
  @IsOptional()
  @IsString()
  apiKey?: string;
}
