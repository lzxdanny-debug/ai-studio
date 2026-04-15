import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  Headers,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { AnalyticsService } from './analytics.service';
import { TrackDto } from './dto/track.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@ai-platform/shared';

@ApiTags('流量统计')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ─── 公开埋点接口 ──────────────────────────────────────────────────────────

  @Post('track')
  @Public()
  @ApiOperation({ summary: '上报页面访问（公开，无需登录）' })
  async track(
    @Body() body: TrackDto,
    @Req() req: Request,
    @Headers('user-agent') userAgent: string,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      req.ip ||
      '';

    await this.analyticsService.track(body, ip, userAgent ?? '');
    return { ok: true };
  }

  // ─── Admin 读取接口 ────────────────────────────────────────────────────────

  @Get('admin/summary')
  @ApiOperation({ summary: '流量概览（PV/UV）' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiQuery({ name: 'days', required: false, type: Number, description: '0 或不传表示全部' })
  async getSummary(
    @Query('days', new DefaultValuePipe(0), ParseIntPipe) days: number,
  ) {
    return this.analyticsService.getSummary(days || undefined);
  }

  @Get('admin/trend')
  @ApiOperation({ summary: '按天 PV/UV 趋势' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getTrend(
    @Query('days', new DefaultValuePipe(14), ParseIntPipe) days: number,
  ) {
    return this.analyticsService.getTrend(days);
  }

  @Get('admin/pages')
  @ApiOperation({ summary: 'Top 页面排行' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTopPages(
    @Query('days', new DefaultValuePipe(0), ParseIntPipe) days: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.analyticsService.getTopPages(days || undefined, limit);
  }

  @Get('admin/sources')
  @ApiOperation({ summary: '来源分布' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getSources(
    @Query('days', new DefaultValuePipe(0), ParseIntPipe) days: number,
  ) {
    return this.analyticsService.getSources(days || undefined);
  }

  @Get('admin/devices')
  @ApiOperation({ summary: '设备类型分布' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getDevices(
    @Query('days', new DefaultValuePipe(0), ParseIntPipe) days: number,
  ) {
    return this.analyticsService.getDevices(days || undefined);
  }

  @Get('admin/geo')
  @ApiOperation({ summary: '地理位置分布' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getGeo(
    @Query('days', new DefaultValuePipe(0), ParseIntPipe) days: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.analyticsService.getGeo(days || undefined, limit);
  }
}
