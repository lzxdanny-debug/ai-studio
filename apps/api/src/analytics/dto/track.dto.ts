import { IsOptional, IsString, MaxLength } from 'class-validator';

export class TrackDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  sessionId?: string;

  @IsString()
  @MaxLength(2048)
  path: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  referrer?: string;
}
