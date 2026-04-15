import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MusicGenerateService } from './music-generate.service';
import { CreateMusicDto, GenerateLyricsDto } from './dto/create-music.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserEntity } from '../../database/entities/user.entity';

@ApiTags('生成-音乐')
@ApiBearerAuth()
@Controller('generate/music')
export class MusicGenerateController {
  constructor(private musicService: MusicGenerateService) {}

  @Post()
  @ApiOperation({ summary: '创建音乐生成任务' })
  async createMusicTask(
    @Body() dto: CreateMusicDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.musicService.createTask(user.id, dto);
  }

  @Post('lyrics')
  @ApiOperation({ summary: 'AI 生成歌词' })
  async generateLyrics(
    @Body() dto: GenerateLyricsDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.musicService.generateLyrics(user.id, dto.prompt);
  }
}
