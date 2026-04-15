import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ImageGenerateService } from './image-generate.service';
import { CreateImageDto } from './dto/create-image.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserEntity } from '../../database/entities/user.entity';

@ApiTags('生成-图像')
@ApiBearerAuth()
@Controller('generate/image')
export class ImageGenerateController {
  constructor(private imageService: ImageGenerateService) {}

  @Post()
  @ApiOperation({ summary: '创建图像生成任务（文生图/图生图）' })
  async createImageTask(
    @Body() dto: CreateImageDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.imageService.createTask(user.id, dto);
  }
}
