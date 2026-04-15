import { Controller, Delete, Get, UseGuards } from '@nestjs/common';
import { ModelPricingService } from './model-pricing.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';

@Controller('model-pricing')
export class ModelPricingController {
  constructor(private readonly service: ModelPricingService) {}

  /** 公开接口，返回 { [modelId]: credits } */
  @Public()
  @Get()
  async getPricing() {
    return this.service.getModelPricing();
  }

  /** 管理员清除价格缓存（需要登录） */
  @Delete('cache')
  @UseGuards(JwtAuthGuard)
  invalidateCache() {
    this.service.invalidateCache();
    return { message: '价格缓存已清除，下次访问将从 Mountsea 重新拉取' };
  }
}
