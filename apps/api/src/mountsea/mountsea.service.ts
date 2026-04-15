import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class MountseaService {
  private readonly logger = new Logger(MountseaService.name);
  public readonly httpClient: AxiosInstance;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('MOUNTSEA_API_KEY');
    this.baseUrl = this.configService.get<string>('MOUNTSEA_BASE_URL', 'https://api.mountsea.ai');

    this.httpClient = this.createClient(apiKey!);
  }

  /** 返回使用指定 Key 的 axios 实例；不传则返回平台默认实例 */
  getClient(userApiKey?: string): AxiosInstance {
    if (!userApiKey) return this.httpClient;
    return this.createClient(userApiKey);
  }

  private createClient(apiKey: string): AxiosInstance {
    const instance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const status = error.response?.status;
        const url = error.config?.url;
        const data = error.response?.data;

        // responseType:'stream' 时 data 是 Node.js 流，需要先读取
        if (data && typeof data.on === 'function') {
          const chunks: Buffer[] = [];
          await new Promise<void>((resolve) => {
            data.on('data', (chunk: Buffer) => chunks.push(chunk));
            data.on('end', resolve);
            data.on('error', resolve);
          });
          const text = Buffer.concat(chunks).toString('utf8');
          this.logger.error(`Mountsea API Error: ${status} ${url} — ${text}`);
        } else {
          let bodyStr: string;
          try { bodyStr = JSON.stringify(data); } catch { bodyStr = String(data); }
          this.logger.error(`Mountsea API Error: ${status} ${url} — ${bodyStr}`);
        }
        throw error;
      },
    );

    return instance;
  }
}
