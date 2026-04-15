import {
  Body, Controller, Delete, Get, Header, Param, Patch, Post, Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ChatSessionsService } from './chat-sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserEntity } from '../database/entities/user.entity';

@ApiTags('对话会话')
@ApiBearerAuth()
@Controller('chat-sessions')
export class ChatSessionsController {
  constructor(private service: ChatSessionsService) {}

  @Post()
  @ApiOperation({ summary: '创建新会话' })
  create(@Body() dto: CreateSessionDto, @CurrentUser() user: UserEntity) {
    return this.service.createSession(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: '获取会话列表' })
  list(@CurrentUser() user: UserEntity) {
    return this.service.listSessions(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取会话详情（含消息）' })
  get(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.service.getSession(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除会话' })
  delete(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.service.deleteSession(user.id, id);
  }

  @Patch(':id/title')
  @ApiOperation({ summary: '修改会话标题' })
  updateTitle(
    @Param('id') id: string,
    @Body('title') title: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.service.updateSessionTitle(user.id, id, title);
  }

  @Post(':id/stream')
  @ApiOperation({ summary: '流式发送消息' })
  @Header('Content-Type', 'text/event-stream')
  stream(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: UserEntity,
    @Res() res: Response,
  ) {
    return this.service.streamMessage(user.id, id, dto, res);
  }
}
