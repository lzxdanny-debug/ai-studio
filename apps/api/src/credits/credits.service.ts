import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { UserCreditEntity } from '../database/entities/user-credit.entity';
import { CreditTransactionEntity } from '../database/entities/credit-transaction.entity';
import { RedisService } from '../auth/redis.service';

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);
  private readonly mountseaUserApiUrl: string;

  constructor(
    @InjectRepository(UserCreditEntity)
    private creditsRepo: Repository<UserCreditEntity>,
    @InjectRepository(CreditTransactionEntity)
    private transactionRepo: Repository<CreditTransactionEntity>,
    private httpService: HttpService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    this.mountseaUserApiUrl = this.configService.get<string>(
      'MOUNTSEA_USER_API_URL',
      'https://dk.mountsea.ai',
    );
  }

  /**
   * 优先从 shanhaiapi.com 读取用户积分余额（需要 mountsea token）。
   * 如果没有缓存的 token，则返回 0。
   */
  async getBalance(userId: string): Promise<{ balance: number }> {
    try {
      const mountseaToken = await this.redisService.get(`auth:mountsea_token:${userId}`);
      if (mountseaToken) {
        const resp = await firstValueFrom(
          this.httpService.get<number>(
            `${this.mountseaUserApiUrl}/api/me/credits`,
            {
              headers: { Authorization: `Bearer ${mountseaToken}` },
              timeout: 5000,
            },
          ),
        );
        const balance = typeof resp.data === 'number' ? resp.data : (resp.data as any)?.credits ?? 0;
        return { balance };
      }
    } catch (err: any) {
      this.logger.warn(`Failed to fetch balance from shanhaiapi.com for user ${userId}: ${err?.message}`);
    }
    return { balance: 0 };
  }

  async getTransactions(userId: string, page = 1, pageSize = 20) {
    const [data, total] = await this.transactionRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 生成前检查余额。
   * 由于生成使用平台 API Key，此处只做展示性校验；如无法获取则放行。
   */
  async checkBalance(userId: string, required: number): Promise<boolean> {
    try {
      const { balance } = await this.getBalance(userId);
      if (balance === 0) return true; // 无法获取余额时放行
      return balance >= required;
    } catch {
      return true;
    }
  }

  /**
   * 积分预留 —— 已改为 no-op（平台 API Key 自动处理计费）。
   */
  async reserveCredits(
    _userId: string,
    _amount: number,
    _description: string,
    _referenceId?: string,
  ): Promise<void> {
    // no-op: billing is handled by the platform API key at Mountsea
  }

  /**
   * 积分退还 —— 已改为 no-op。
   */
  async refundCredits(
    _userId: string,
    _amount: number,
    _referenceId: string,
    _description: string,
  ): Promise<void> {
    // no-op
  }

  /**
   * 充值积分（保留，以备后用）。
   */
  async addCredits(
    userId: string,
    amount: number,
    referenceId: string,
    description: string,
  ): Promise<void> {
    let credit = await this.creditsRepo.findOne({ where: { userId } });
    if (!credit) {
      credit = this.creditsRepo.create({ userId, balance: 0 });
    }
    credit.balance = Number(credit.balance) + amount;
    await this.creditsRepo.save(credit);

    const tx = this.transactionRepo.create({
      userId,
      amount,
      type: 'purchase' as any,
      referenceId,
      description,
    });
    await this.transactionRepo.save(tx);
  }
}
