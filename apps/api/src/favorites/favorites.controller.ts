import { Controller, Get, Post, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserEntity } from '../database/entities/user.entity';

@ApiTags('收藏')
@ApiBearerAuth()
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post(':taskId')
  @ApiOperation({ summary: '切换收藏状态' })
  toggle(@Param('taskId') taskId: string, @CurrentUser() user: UserEntity) {
    return this.favoritesService.toggle(user.id, taskId);
  }

  @Get(':taskId/status')
  @ApiOperation({ summary: '检查是否已收藏' })
  checkStatus(@Param('taskId') taskId: string, @CurrentUser() user: UserEntity) {
    return this.favoritesService.checkStatus(user.id, taskId);
  }

  @Get(':taskId/favoritors')
  @ApiOperation({ summary: '获取收藏列表（仅作者可查看）' })
  getFavoritors(@Param('taskId') taskId: string, @CurrentUser() user: UserEntity) {
    return this.favoritesService.getFavoritors(taskId, user.id);
  }
}
