import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import { ChatSessionEntity } from '../database/entities/chat-session.entity';
import { ChatMessageEntity } from '../database/entities/chat-message.entity';
import { MountseaChatService } from '../mountsea/services/chat.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatSessionsService {
  private readonly logger = new Logger(ChatSessionsService.name);

  constructor(
    @InjectRepository(ChatSessionEntity)
    private sessionRepo: Repository<ChatSessionEntity>,
    @InjectRepository(ChatMessageEntity)
    private messageRepo: Repository<ChatMessageEntity>,
    private mountseaChatService: MountseaChatService,
  ) {}

  async createSession(userId: string, dto: CreateSessionDto): Promise<ChatSessionEntity> {
    const session = this.sessionRepo.create({
      userId,
      model: dto.model || 'gpt-5.1',
      title: dto.title || '新对话',
    });
    return this.sessionRepo.save(session);
  }

  async listSessions(userId: string): Promise<ChatSessionEntity[]> {
    return this.sessionRepo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  async getSession(userId: string, sessionId: string): Promise<{ session: ChatSessionEntity; messages: ChatMessageEntity[] }> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('会话不存在');
    if (session.userId !== userId) throw new ForbiddenException('无权访问该会话');

    const messages = await this.messageRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
    return { session, messages };
  }

  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('会话不存在');
    if (session.userId !== userId) throw new ForbiddenException('无权删除该会话');
    await this.sessionRepo.remove(session);
  }

  async updateSessionTitle(userId: string, sessionId: string, title: string): Promise<ChatSessionEntity> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('会话不存在');
    if (session.userId !== userId) throw new ForbiddenException();
    session.title = title.slice(0, 200);
    return this.sessionRepo.save(session);
  }

  /** 流式发送消息，边推流边保存结果 */
  async streamMessage(
    userId: string,
    sessionId: string,
    dto: SendMessageDto,
    response: Response,
  ): Promise<void> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('会话不存在');
    if (session.userId !== userId) throw new ForbiddenException();

    // 取最后一条 user 消息（由前端传入完整 messages 数组）
    const lastUserMsg = [...dto.messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) {
      response.write('data: ' + JSON.stringify({ error: '消息内容不能为空' }) + '\n\n');
      response.end();
      return;
    }

    // 保存 user 消息
    await this.messageRepo.save(
      this.messageRepo.create({ sessionId, role: 'user', content: lastUserMsg.content }),
    );

    // 自动生成标题（首条 user 消息）
    if (session.title === '新对话') {
      session.title = lastUserMsg.content.slice(0, 60) || '新对话';
      await this.sessionRepo.save(session);
    }

    // 更新会话模型
    const model = dto.model || session.model;
    if (dto.model && dto.model !== session.model) {
      session.model = dto.model;
      await this.sessionRepo.save(session);
    }

    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();

    let fullContent = '';
    try {
      const generator = this.mountseaChatService.streamChatCompletions(model, dto.messages, dto.apiKey);
      for await (const chunk of generator) {
        fullContent += chunk;
        response.write('data: ' + JSON.stringify({ content: chunk }) + '\n\n');
      }
      response.write('data: [DONE]\n\n');
    } catch (error: any) {
      this.logger.error(`streamMessage error: ${error?.message}`);
      const errMsg = error?.message || '生成失败，请重试';
      response.write('data: ' + JSON.stringify({ error: errMsg }) + '\n\n');
    } finally {
      // 保存 assistant 消息（即使内容为空也保存，防止数据丢失）
      if (fullContent) {
        await this.messageRepo.save(
          this.messageRepo.create({ sessionId, role: 'assistant', content: fullContent }),
        );
        // 更新 updatedAt
        await this.sessionRepo.update(sessionId, { updatedAt: new Date() });
      }
      response.end();
    }
  }
}
