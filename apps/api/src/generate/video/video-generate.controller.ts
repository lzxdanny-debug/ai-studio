import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VideoGenerateService } from './video-generate.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserEntity } from '../../database/entities/user.entity';

@ApiTags('生成-视频')
@ApiBearerAuth()
@Controller('generate/video')
export class VideoGenerateController {
  constructor(private videoService: VideoGenerateService) {}

  @Post()
  @ApiOperation({ summary: '创建视频生成任务（文生视频/图生视频）' })
  async createVideoTask(
    @Body() dto: CreateVideoDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.videoService.createTask(user.id, dto);
  }
}
