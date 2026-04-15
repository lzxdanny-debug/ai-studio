import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserEntity } from '../database/entities/user.entity';
import { RedisService } from '../auth/redis.service';

@ApiTags('用户 API Key')
@ApiBearerAuth()
@Controller('user-keys')
export class UserKeysController {
  private readonly mountseaUserApiUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    this.mountseaUserApiUrl = this.configService.get<string>(
      'MOUNTSEA_USER_API_URL',
      'https://dk.mountsea.ai',
    );
  }

  @Get()
  @ApiOperation({ summary: '获取用户在 shanhaiapi.com 上的 API Key 列表' })
  async getKeys(
    @CurrentUser() user: UserEntity,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    const mountseaToken = await this.redisService.get(`auth:mountsea_token:${user.id}`);
    if (!mountseaToken) {
      return { items: [], meta: { totalItems: 0, totalPages: 0, currentPage: 1 } };
    }

    try {
      const resp = await firstValueFrom(
        this.httpService.get(
          `${this.mountseaUserApiUrl}/api/me/keys?page=${page}&limit=${limit}`,
          {
            headers: { Authorization: `Bearer ${mountseaToken}` },
            timeout: 8000,
          },
        ),
      );
      return resp.data;
    } catch {
      return { items: [], meta: { totalItems: 0, totalPages: 0, currentPage: 1 } };
    }
  }
}
