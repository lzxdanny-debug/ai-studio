import { IsEnum, IsString, IsOptional, IsEmail, MaxLength } from 'class-validator';

export class CreateFeedbackDto {
  @IsEnum(['bug', 'suggestion', 'other'])
  category: string;

  @IsString()
  @MaxLength(1000)
  content: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  screenshotUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  pagePath?: string;
}
