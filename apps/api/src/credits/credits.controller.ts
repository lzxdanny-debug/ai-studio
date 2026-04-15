import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreditsService } from './credits.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserEntity } from '../database/entities/user.entity';

@ApiTags('积分')
@ApiBearerAuth()
@Controller('credits')
export class CreditsController {
  constructor(private creditsService: CreditsService) {}

  @Get('balance')
  @ApiOperation({ summary: '查询积分余额' })
  async getBalance(@CurrentUser() user: UserEntity) {
    return this.creditsService.getBalance(user.id);
  }

  @Get('transactions')
  @ApiOperation({ summary: '积分流水记录' })
  async getTransactions(
    @CurrentUser() user: UserEntity,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.creditsService.getTransactions(user.id, page, pageSize);
  }
}
