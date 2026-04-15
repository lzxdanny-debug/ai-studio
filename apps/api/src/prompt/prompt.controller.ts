import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { EnhancePromptDto } from './dto/enhance-prompt.dto';
import { PromptService } from './prompt.service';

@ApiTags('提示词助手')
@Controller('prompt')
@UseGuards(JwtAuthGuard)
export class PromptController {
  constructor(private readonly promptService: PromptService) {}

  @Post('enhance')
  async enhance(@Body() dto: EnhancePromptDto): Promise<{ variants: string[] }> {
    return this.promptService.enhance(dto);
  }
}
