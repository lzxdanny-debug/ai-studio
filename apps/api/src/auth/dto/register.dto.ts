import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8, { message: '密码至少8位' })
  @MaxLength(50)
  password: string;

  @ApiProperty({ example: '小明' })
  @IsString()
  @MinLength(2, { message: '显示名称至少2个字符' })
  @MaxLength(30)
  displayName: string;
}
