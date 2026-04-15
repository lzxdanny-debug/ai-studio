import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@ai-platform/shared';

@ApiTags('用户反馈')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  // ─── 公开提交接口 ────────────────────────────────────────────────────────────

  @Post()
  @Public()
  @ApiOperation({ summary: '提交用户反馈（无需登录）' })
  async create(
    @Body() dto: CreateFeedbackDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user as { id?: string } | undefined;
    return this.feedbackService.create(dto, user?.id);
  }

  // ─── Admin 接口 ───────────────────────────────────────────────────────────

  @Get('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取反馈列表（管理员）' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  async listAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('category') category?: string,
    @Query('isRead') isReadStr?: string,
    @Query('search') search?: string,
  ) {
    const isRead = isReadStr === undefined ? undefined : isReadStr === 'true';
    return this.feedbackService.listAll(page, pageSize, category, isRead, search);
  }

  @Get('admin/unread-count')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取未读反馈数量' })
  async getUnreadCount() {
    const count = await this.feedbackService.getUnreadCount();
    return { count };
  }

  @Patch('admin/:id/read')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '标记反馈为已读' })
  async markRead(@Param('id') id: string) {
    return this.feedbackService.markRead(id);
  }

  @Delete('admin/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除反馈' })
  async remove(@Param('id') id: string) {
    return this.feedbackService.remove(id);
  }
}
