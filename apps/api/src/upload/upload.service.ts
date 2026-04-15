import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly localUploadDir = 'uploads';

  constructor(private configService: ConfigService) {
    if (!fs.existsSync(this.localUploadDir)) {
      fs.mkdirSync(this.localUploadDir, { recursive: true });
    }
  }

  async uploadImage(
    file: Express.Multer.File,
    userId: string,
  ): Promise<{ url: string; filename: string }> {
    if (!file) throw new BadRequestException('请选择要上传的图片');

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('仅支持 JPG、PNG、WEBP、GIF 格式');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('图片大小不能超过 10MB');
    }

    const ext = path.extname(file.originalname);
    const filename = `${userId}/${uuidv4()}${ext}`;

    const s3Endpoint = this.configService.get<string>('S3_ENDPOINT');
    if (s3Endpoint) {
      return this.uploadToS3(file, filename);
    }

    // 本地存储（开发环境）
    return this.saveLocally(file, filename);
  }

  private async saveLocally(
    file: Express.Multer.File,
    filename: string,
  ): Promise<{ url: string; filename: string }> {
    const dir = path.join(this.localUploadDir, path.dirname(filename));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(this.localUploadDir, filename);
    fs.writeFileSync(filePath, file.buffer);

    // 读取实时值（process.env），而非 ConfigService 缓存。
    // 这样 main.ts 在服务器启动后设置的 APP_URL（来自 cloudflare tunnel）可以被正确读取。
    const appUrl = process.env.APP_URL || this.configService.get<string>('APP_URL', '');
    if (!appUrl) {
      const isProd = (process.env.NODE_ENV || 'development') === 'production';
      if (isProd) {
        this.logger.error(
          '❌ [PROD] APP_URL 未设置！图片 URL 将为 localhost，外部 AI API 无法访问。' +
          '请配置 S3_ENDPOINT 或 APP_URL=https://your-api-domain.com',
        );
      } else {
        this.logger.warn(
          '⚠️  APP_URL 未设置（tunnel 可能还在初始化）。' +
          '如持续出现此问题，请重试或手动在 .env 中设置 APP_URL。',
        );
      }
    }
    const baseUrl = appUrl || `http://localhost:${process.env.PORT || '3001'}`;
    return {
      url: `${baseUrl}/uploads/${filename}`,
      filename,
    };
  }

  private async uploadToS3(
    file: Express.Multer.File,
    filename: string,
  ): Promise<{ url: string; filename: string }> {
    // TODO: 接入 AWS S3 或阿里云 OSS
    this.logger.warn('S3 upload not implemented, falling back to local storage');
    return this.saveLocally(file, filename);
  }
}
