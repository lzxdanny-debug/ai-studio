import { Controller, Post, Body, Res, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ChatGenerateService } from './chat-generate.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserEntity } from '../../database/entities/user.entity';

@ApiTags('生成-对话')
@ApiBearerAuth()
@Controller('generate/chat')
export class ChatGenerateController {
  constructor(private chatService: ChatGenerateService) {}

  @Post()
  @ApiOperation({ summary: 'AI 对话（非流式）' })
  async chat(
    @Body() dto: CreateChatDto,
    @CurrentUser() _user: UserEntity,
  ) {
    return this.chatService.chat({ ...dto, stream: false });
  }

  @Post('stream')
  @ApiOperation({ summary: 'AI 对话（SSE 流式）' })
  @Header('Content-Type', 'text/event-stream')
  async streamChat(
    @Body() dto: CreateChatDto,
    @CurrentUser() _user: UserEntity,
    @Res() res: Response,
  ) {
    await this.chatService.streamChat({ ...dto, stream: true }, res);
  }
}
