import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import * as http from 'http';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const COS = require('cos-nodejs-sdk-v5');

const CONTENT_TYPE_MAP: Record<string, string> = {
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.mov':  'video/quicktime',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.webp': 'image/webp',
  '.gif':  'image/gif',
  '.mp3':  'audio/mpeg',
  '.wav':  'audio/wav',
  '.ogg':  'audio/ogg',
};

/** 最大下载重定向次数 */
const MAX_REDIRECTS = 5;
/** 单文件下载超时（ms）—— 60MB 视频在慢速 CDN 约需 60s */
const DOWNLOAD_TIMEOUT_MS = 120_000;

@Injectable()
export class CosService {
  private readonly logger = new Logger(CosService.name);
  private readonly cos: any;
  private readonly bucket: string;
  private readonly region: string;
  private readonly enabled: boolean;

  constructor(private config: ConfigService) {
    const secretId  = config.get<string>('COS_SECRET_ID', '');
    const secretKey = config.get<string>('COS_SECRET_KEY', '');
    this.bucket  = config.get<string>('COS_BUCKET',  'aiconsole-1387810185');
    this.region  = config.get<string>('COS_REGION',  'ap-hongkong');
    this.enabled = !!(secretId && secretKey);

    if (this.enabled) {
      this.cos = new COS({ SecretId: secretId, SecretKey: secretKey });
      this.logger.log(`COS storage enabled → ${this.bucket} (${this.region})`);
    } else {
      this.logger.warn('COS credentials not configured — file archiving disabled');
    }
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 将远程 URL 的文件下载后上传到 COS，返回 COS 永久访问链接。
   * 上传失败时抛出异常，由调用方决定是否降级使用原始 URL。
   */
  async uploadFromUrl(sourceUrl: string, cosKey: string): Promise<string> {
    this.logger.debug(`Downloading ${sourceUrl} → COS key: ${cosKey}`);
    const buffer = await this.downloadToBuffer(sourceUrl);
    const ext = path.extname(cosKey).toLowerCase();
    const contentType = CONTENT_TYPE_MAP[ext] ?? 'application/octet-stream';

    await new Promise<void>((resolve, reject) => {
      this.cos.putObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key:    cosKey,
          Body:   buffer,
          ContentType: contentType,
        },
        (err: any) => (err ? reject(err) : resolve()),
      );
    });

    const url = `https://${this.bucket}.cos.${this.region}.myqcloud.com/${cosKey}`;
    this.logger.debug(`Uploaded → ${url}`);
    return url;
  }

  /**
   * 批量将一组 URL 上传到 COS，以 taskId 为目录。
   * 若某个文件上传失败，保留原始 URL（不中断整批）。
   */
  async archiveResultUrls(taskId: string, urls: string[]): Promise<string[]> {
    const results: string[] = [];
    for (let i = 0; i < urls.length; i++) {
      const sourceUrl = urls[i];
      try {
        const ext = this.extractExt(sourceUrl);
        const cosKey = `tasks/${taskId}/file_${i}${ext}`;
        const cosUrl = await this.uploadFromUrl(sourceUrl, cosKey);
        results.push(cosUrl);
      } catch (err: any) {
        this.logger.error(`Failed to archive ${sourceUrl}: ${err?.message}`, err?.stack);
        results.push(sourceUrl); // 降级：保留原始 URL
      }
    }
    return results;
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private extractExt(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      const ext = path.extname(pathname).split('?')[0].toLowerCase();
      return ext || '.bin';
    } catch {
      return '.bin';
    }
  }

  private downloadToBuffer(url: string, redirectCount = 0): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      if (redirectCount > MAX_REDIRECTS) {
        return reject(new Error(`Too many redirects for ${url}`));
      }

      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, { timeout: DOWNLOAD_TIMEOUT_MS }, (res) => {
        // 跟随 3xx 重定向
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          return resolve(this.downloadToBuffer(res.headers.location, redirectCount + 1));
        }

        if (res.statusCode && res.statusCode >= 400) {
          return reject(new Error(`HTTP ${res.statusCode} downloading ${url}`));
        }

        const chunks: Buffer[] = [];
        res.on('data',  (chunk: Buffer) => chunks.push(chunk));
        res.on('end',   () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      });

      req.on('error',   reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Download timeout (${DOWNLOAD_TIMEOUT_MS}ms) for ${url}`));
      });
    });
  }
}
