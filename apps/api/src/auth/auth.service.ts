import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { RedisService } from './redis.service';
import { UserEntity } from '../database/entities/user.entity';
import { AuthTokens, UserRole } from '@ai-platform/shared';

/** shanhaiapi.com 登录接口返回结构 */
interface MountseaLoginResult {
  access_token: string;
  username: string;
  role: string;
  credits: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly mountseaUserApiUrl: string;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private httpService: HttpService,
  ) {
    this.mountseaUserApiUrl = this.configService.get<string>(
      'MOUNTSEA_USER_API_URL',
      'https://dk.mountsea.ai',
    );
  }

  /**
   * 代理到 shanhaiapi.com 的登录接口。
   * 成功后在本地 find-or-create 用户（以 username 为唯一键），并颁发本地 JWT。
   */
  async login(dto: {
    identifier: string;
    password: string;
  }): Promise<{ user: Partial<UserEntity>; tokens: AuthTokens }> {
    let mountseaResult: MountseaLoginResult;
    try {
      const resp = await firstValueFrom(
        this.httpService.post<MountseaLoginResult>(
          `${this.mountseaUserApiUrl}/api/auth/login`,
          { identifier: dto.identifier, password: dto.password },
          { timeout: 10000 },
        ),
      );
      mountseaResult = resp.data;
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        '邮箱/用户名或密码错误';
      throw new UnauthorizedException(msg);
    }

    if (!mountseaResult?.access_token) {
      throw new UnauthorizedException('shanhaiapi.com 登录失败');
    }

    // 在本地 find-or-create 用户
    const user = await this.usersService.findOrCreateByMountsea({
      username: mountseaResult.username,
      role: mountseaResult.role,
    });

    // 将 mountsea token 缓存到 Redis（7天），供积分查询使用
    await this.redisService.set(
      `auth:mountsea_token:${user.id}`,
      mountseaResult.access_token,
      7 * 24 * 3600,
    );

    const tokens = await this.generateTokens(user);
    return { user, tokens };
  }

  /**
   * 本地管理员登录 —— 直接校验本地数据库账号，不走 Mountsea 代理。
   * 要求账号 role === 'admin'。
   */
  async adminLogin(
    email: string,
    password: string,
  ): Promise<{ user: Partial<UserEntity>; tokens: AuthTokens }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('账号不存在');
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException('该账号未设置本地密码');
    }
    const valid = await this.usersService.validatePassword(user, password);
    if (!valid) {
      throw new UnauthorizedException('密码错误');
    }
    if (user.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('该账号无管理员权限');
    }
    const tokens = await this.generateTokens(user);
    return { user, tokens };
  }

  /**
   * SSO Token 兑换 —— 接收 Mountsea 颁发的 access_token，
   * 验证后在本地 find-or-create 用户并颁发本地 JWT。
   */
  async loginWithSsoToken(
    ssoToken: string,
  ): Promise<{ user: Partial<UserEntity>; tokens: AuthTokens }> {
    // 1. 用 Mountsea token 拉取用户信息
    let profile: { username: string; role: string; credits: number };
    try {
      const resp = await firstValueFrom(
        this.httpService.get<{ username: string; role: string; credits: number }>(
          `${this.mountseaUserApiUrl}/api/me/profile`,
          {
            headers: { Authorization: `Bearer ${ssoToken}` },
            timeout: 8000,
          },
        ),
      );
      profile = resp.data;
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'SSO Token 验证失败，请重新登录';
      throw new UnauthorizedException(msg);
    }

    if (!profile?.username) {
      throw new UnauthorizedException('无法获取 Mountsea 用户信息');
    }

    // 2. 在本地 find-or-create 用户
    const user = await this.usersService.findOrCreateByMountsea({
      username: profile.username,
      role: profile.role,
    });

    // 3. 缓存 Mountsea token（供积分查询使用）
    await this.redisService.set(
      `auth:mountsea_token:${user.id}`,
      ssoToken,
      7 * 24 * 3600,
    );

    const tokens = await this.generateTokens(user);
    return { user, tokens };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: { sub: string; jti: string; type: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('无效的刷新令牌');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('令牌类型错误');
    }

    const stored = await this.redisService.get(`auth:refresh:${payload.sub}`);
    if (!stored || stored !== payload.jti) {
      throw new UnauthorizedException('刷新令牌已失效，请重新登录');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return this.generateTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await this.redisService.del(`auth:refresh:${userId}`);
    await this.redisService.del(`auth:mountsea_token:${userId}`);
  }

  async loginWithGoogle(user: UserEntity): Promise<AuthTokens> {
    return this.generateTokens(user);
  }

  private async generateTokens(user: UserEntity | Partial<UserEntity>): Promise<AuthTokens> {
    const jti = uuidv4();
    const refreshJti = uuidv4();

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email ?? '', role: user.role, jti },
      { expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m') },
    );

    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const refreshToken = this.jwtService.sign(
      { sub: user.id, jti: refreshJti, type: 'refresh' },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiresIn,
      },
    );

    await this.redisService.set(`auth:refresh:${user.id}`, refreshJti, 7 * 24 * 3600);

    return { accessToken, refreshToken };
  }
}
