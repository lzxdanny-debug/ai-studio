import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { UserRole, TaskType, TaskStatus } from '@ai-platform/shared';

@ApiTags('管理后台')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // ─── Stats ─────────────────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: '仪表盘统计数据' })
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('trends')
  @ApiOperation({ summary: '趋势图表数据' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getTrends(
    @Query('days', new DefaultValuePipe(14), ParseIntPipe) days: number,
  ) {
    return this.adminService.getTrends(days);
  }

  @Get('trends/status')
  @ApiOperation({ summary: '任务状态分布（支持时间过滤）' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: '0 表示全部时间' })
  async getStatusDistribution(
    @Query('days', new DefaultValuePipe(0), ParseIntPipe) days: number,
  ) {
    return this.adminService.getStatusDistribution(days || undefined);
  }

  // ─── Users ─────────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: '用户列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async listUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.listUsers(page, pageSize, search);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: '修改用户角色' })
  async updateUserRole(
    @Param('id') id: string,
    @Body() body: { role: UserRole },
  ) {
    return this.adminService.updateUserRole(id, body.role);
  }

  @Post('users/:id/credits')
  @ApiOperation({ summary: '手动调整用户积分' })
  async adjustCredits(
    @Param('id') id: string,
    @Body() body: { amount: number; description: string },
  ) {
    return this.adminService.adjustUserCredits(id, body.amount, body.description);
  }

  // ─── Tasks ─────────────────────────────────────────────────────────────────

  @Get('tasks')
  @ApiOperation({ summary: '所有任务列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: TaskType })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async listTasks(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('type') type?: TaskType,
    @Query('status') status?: TaskStatus,
    @Query('userId') userId?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listAllTasks(page, pageSize, type, status, userId, search);
  }

  @Delete('tasks/:id')
  @ApiOperation({ summary: '强制删除任务' })
  async deleteTask(@Param('id') id: string) {
    return this.adminService.adminDeleteTask(id);
  }

  @Patch('tasks/:id/visibility')
  @ApiOperation({ summary: '强制切换任务可见性（用户侧 isPublic）' })
  async toggleTaskVisibility(@Param('id') id: string) {
    return this.adminService.adminToggleTaskVisibility(id);
  }

  @Patch('tasks/:id/admin-visible')
  @ApiOperation({ summary: '管理员控制作品是否展示（adminVisible）' })
  async toggleAdminVisible(@Param('id') id: string) {
    return this.adminService.adminToggleAdminVisible(id);
  }

  // ─── Credits ───────────────────────────────────────────────────────────────

  @Get('credits/transactions')
  @ApiOperation({ summary: '所有积分流水' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async listTransactions(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('userId') userId?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listAllTransactions(page, pageSize, userId, search);
  }

  // ─── Comments ──────────────────────────────────────────────────────────────

  @Get('comments')
  @ApiOperation({ summary: '所有评论列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'isApproved', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  async listComments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('isApproved') isApprovedStr?: string,
    @Query('search') search?: string,
  ) {
    const isApproved = isApprovedStr === undefined
      ? undefined
      : isApprovedStr === 'true';
    return this.adminService.listAllComments(page, pageSize, isApproved, search);
  }

  @Patch('comments/:id/approval')
  @ApiOperation({ summary: '切换评论审核状态（通过/不通过）' })
  async toggleCommentApproval(@Param('id') id: string) {
    return this.adminService.adminToggleCommentApproval(id);
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: '删除评论' })
  async deleteComment(@Param('id') id: string) {
    return this.adminService.adminDeleteComment(id);
  }
}
