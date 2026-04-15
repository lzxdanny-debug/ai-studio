import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export type PromptType = 'video' | 'image' | 'music';

export class EnhancePromptDto {
  @IsString()
  @MaxLength(500)
  prompt: string;

  @IsEnum(['video', 'image', 'music'])
  type: PromptType;

  @IsOptional()
  @IsString()
  apiKey?: string;
}
