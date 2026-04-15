import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as path from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { UsersService } from './users/users.service';

/**
 * 开发环境自动建立 Cloudflare Quick Tunnel，让上传图片的 URL 可被外部 AI API 访问。
 * 在服务器 listen() 之后调用，不阻塞主启动流程。
 * 设置成功后写入 process.env.APP_URL，UploadService 每次请求时直接读取。
 */
async function setupDevTunnel(port: number): Promise<void> {
  if (process.env.APP_URL) {
    console.log(`🔗 APP_URL already set: ${process.env.APP_URL}`);
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { tunnel, bin, install } = require('cloudflared') as {
      tunnel: (args: string[]) => import('events').EventEmitter & { stop: () => void };
      bin: string;
      install: (to: string) => Promise<string>;
    };

    // 确保二进制存在，若不存在则自动下载（首次运行可能需要 30-60s）
    if (!fs.existsSync(bin)) {
      console.log('📥 正在下载 cloudflared 二进制（仅首次）...');
      await install(bin);
    }

    // macOS：清除可能存在的隔离扩展属性（Gatekeeper 限制）
    if (process.platform === 'darwin') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { execSync } = require('child_process') as typeof import('child_process');
        execSync(`xattr -c "${bin}"`, { stdio: 'ignore' });
      } catch {
        // xattr 失败不影响流程
      }
    }

    const tun = tunnel(['tunnel', '--url', `http://localhost:${port}`]);

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Tunnel setup timeout (30s)')), 30_000);

      tun.on('url', (url: string) => {
        clearTimeout(timer);
        process.env.APP_URL = url;
        console.log(`\n🌐 Dev tunnel (Cloudflare): ${url} → localhost:${port}`);
        console.log('   图片上传 URL 已可被外部 AI API 访问\n');
        resolve();
      });

      tun.on('error', (err: Error) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    // tunnel 意外关闭时提示重启
    tun.on('close', () =>
      console.warn('\n⚠️  Dev tunnel closed — 重启 API 服务即可重建 tunnel\n'),
    );
  } catch (err: unknown) {
    console.warn(
      '\n⚠️  无法启动 Cloudflare tunnel:',
      err instanceof Error ? err.message : err,
    );
    console.warn(
      '   图生视频/图生图功能需要外网可访问的图片 URL。',
    );
    console.warn(
      '   请手动在 .env 中配置 APP_URL，或安装 cloudflared: brew install cloudflared\n',
    );
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const uploadsDir = path.join(process.cwd(), 'uploads');
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  const configService = app.get(ConfigService);

  app.use(
    helmet({
      // 允许跨域读取响应内容（admin:3002 → api:3001），否则 helmet 默认 same-origin 会拦截
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const allowedOrigins = configService
    .get<string>('ALLOWED_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AI 多模态创作平台 API')
    .setDescription('基于 Mountsea API 构建的 AI 创作平台后端接口文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // 按环境变量自动创建/更新本地管理员账号
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    try {
      const usersService = app.get(UsersService);
      await usersService.ensureAdminUser(adminEmail, adminPassword);
      console.log(`👤 Admin account ready: ${adminEmail}`);
    } catch (err: unknown) {
      console.error('❌ Failed to initialize admin account:', err instanceof Error ? err.message : err);
    }
  }

  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);

  console.log(`🚀 API Server running on http://localhost:${port}`);
  console.log(`📖 Swagger docs: http://localhost:${port}/api/docs`);

  const nodeEnv = process.env.NODE_ENV || 'development';

  if (nodeEnv === 'production') {
    // 生产环境：APP_URL 或 S3 必须二选一
    const appUrl = process.env.APP_URL;
    const s3Endpoint = process.env.S3_ENDPOINT;
    if (!appUrl && !s3Endpoint) {
      console.error(
        '\n❌ [PROD] APP_URL 和 S3_ENDPOINT 均未设置！\n' +
        '   图生视频/图生图功能将无法正常使用。\n' +
        '   建议：配置 S3_ENDPOINT（推荐），或设置 APP_URL=https://your-api-domain.com\n',
      );
    } else {
      console.log(`🖼️  [PROD] 图片存储: ${s3Endpoint ? 'S3/OSS' : appUrl}`);
    }
  } else {
    // 开发环境：服务器已就绪后再建 tunnel，不阻塞启动
    setupDevTunnel(port).catch(() => { /* 错误已在内部打印 */ });
  }
}

bootstrap();
