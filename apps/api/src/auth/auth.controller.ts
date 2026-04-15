import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserEntity } from '../database/entities/user.entity';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '登录（代理到 shanhaiapi.com）' })
  async login(@Body() body: { identifier: string; password: string }) {
    const { user, tokens } = await this.authService.login(body);
    return {
      user: {
        id: user.id,
        email: user.email ?? '',
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      ...tokens,
    };
  }

  @Public()
  @Post('admin-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '管理员本地账号登录（不经过 Mountsea）' })
  async adminLogin(@Body() body: { email: string; password: string }) {
    const { user, tokens } = await this.authService.adminLogin(body.email, body.password);
    return {
      user: {
        id: user.id,
        email: user.email ?? '',
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      ...tokens,
    };
  }

  @Public()
  @Post('sso-exchange')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用 Mountsea SSO Token 换取本地 JWT' })
  async ssoExchange(@Body('ssoToken') ssoToken: string) {
    if (!ssoToken) {
      return { message: 'ssoToken 不能为空' };
    }
    const { user, tokens } = await this.authService.loginWithSsoToken(ssoToken);
    return {
      user: {
        id: user.id,
        email: user.email ?? '',
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      ...tokens,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新 Token' })
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: '注销登录' })
  async logout(@CurrentUser() user: UserEntity) {
    await this.authService.logout(user.id);
    return { message: '已退出登录' };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  async me(@CurrentUser() user: UserEntity) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth 登录入口' })
  async googleAuth() {
    // 由 passport-google-oauth20 处理重定向
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth 回调' })
  async googleAuthCallback(@Req() req: any, @Res() res: any) {
    try {
      const tokens = await this.authService.loginWithGoogle(req.user);
      const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
      const params = new URLSearchParams({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
      return res.redirect(`${frontendUrl}/auth/google/callback?${params}`);
    } catch (err: any) {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
      return res.redirect(
        `${frontendUrl}/auth/google/callback?error=${encodeURIComponent(err.message || '登录失败')}`,
      );
    }
  }
}
