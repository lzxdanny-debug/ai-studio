import { Module } from '@nestjs/common';
import { ModelPricingService } from './model-pricing.service';
import { ModelPricingController } from './model-pricing.controller';

@Module({
  providers:   [ModelPricingService],
  controllers: [ModelPricingController],
  exports:     [ModelPricingService],
})
export class ModelPricingModule {}
