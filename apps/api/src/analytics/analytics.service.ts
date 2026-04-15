import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import * as geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';
import { PageViewEntity } from '../database/entities/page-view.entity';

const SEARCH_ENGINES = ['google', 'baidu', 'bing', 'sogou', 'so.com', 'yahoo', 'yandex', 'duckduckgo'];
const SOCIAL_SITES = ['facebook', 'twitter', 'instagram', 'weibo', 'douyin', 'youtube', 'linkedin', 'tiktok', 'wechat', 'zhihu', 'bilibili', 'xiaohongshu'];

function classifyReferrer(referrer: string): { source: string; domain: string | null } {
  if (!referrer) return { source: 'direct', domain: null };

  let domain: string | null = null;
  try {
    domain = new URL(referrer).hostname.replace(/^www\./, '');
  } catch {
    return { source: 'external', domain: null };
  }

  const lower = domain.toLowerCase();
  if (SEARCH_ENGINES.some((s) => lower.includes(s))) return { source: 'search', domain };
  if (SOCIAL_SITES.some((s) => lower.includes(s))) return { source: 'social', domain };
  return { source: 'external', domain };
}

function extractIp(raw: string | string[] | undefined): string {
  if (!raw) return '';
  const str = Array.isArray(raw) ? raw[0] : raw;
  return str.split(',')[0].trim();
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(PageViewEntity)
    private readonly pvRepo: Repository<PageViewEntity>,
  ) {}

  async track(dto: {
    sessionId?: string;
    path: string;
    referrer?: string;
    userId?: string;
  }, rawIp: string, userAgent: string) {
    const { source, domain } = classifyReferrer(dto.referrer ?? '');

    const ip = extractIp(rawIp);
    let country: string | undefined;
    let city: string | undefined;
    if (ip && ip !== '::1' && ip !== '127.0.0.1') {
      const geo = geoip.lookup(ip);
      if (geo) {
        country = geo.country;
        city = geo.city || undefined;
      }
    }

    let deviceType: string | undefined;
    let browser: string | undefined;
    if (userAgent) {
      const parser = new UAParser(userAgent);
      const device = parser.getDevice();
      const browserInfo = parser.getBrowser();
      deviceType = device.type ?? 'desktop';
      browser = browserInfo.name ?? undefined;
    }

    const pv = this.pvRepo.create({
      sessionId: dto.sessionId,
      path: dto.path,
      referrer: dto.referrer?.slice(0, 2048),
      referrerSource: source,
      referrerDomain: domain ?? undefined,
      country,
      city,
      deviceType,
      browser,
      userId: dto.userId,
    });

    await this.pvRepo.save(pv);
  }

  // ─── Admin queries ──────────────────────────────────────────────────────────

  private sinceDate(days?: number): Date | undefined {
    if (!days || days <= 0) return undefined;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - days + 1);
    return d;
  }

  async getSummary(days?: number) {
    const since = this.sinceDate(days);
    const where = since ? { createdAt: MoreThanOrEqual(since) } : {};

    const [pv, uvResult] = await Promise.all([
      this.pvRepo.count({ where }),
      this.pvRepo
        .createQueryBuilder('pv')
        .select('COUNT(DISTINCT pv.session_id)', 'uv')
        .where(since ? 'pv.created_at >= :since' : '1=1', since ? { since } : {})
        .getRawOne<{ uv: string }>(),
    ]);

    return { pv, uv: parseInt(uvResult?.uv ?? '0', 10) };
  }

  async getTrend(days = 14) {
    const results: { date: string; pv: number; uv: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - i);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const [pvCount, uvResult] = await Promise.all([
        this.pvRepo
          .createQueryBuilder('pv')
          .where('pv.created_at >= :start AND pv.created_at < :end', { start, end })
          .getCount(),
        this.pvRepo
          .createQueryBuilder('pv')
          .select('COUNT(DISTINCT pv.session_id)', 'uv')
          .where('pv.created_at >= :start AND pv.created_at < :end', { start, end })
          .getRawOne<{ uv: string }>(),
      ]);

      results.push({
        date: start.toISOString().split('T')[0],
        pv: pvCount,
        uv: parseInt(uvResult?.uv ?? '0', 10),
      });
    }

    return results;
  }

  async getTopPages(days?: number, limit = 10) {
    const since = this.sinceDate(days);
    const qb = this.pvRepo
      .createQueryBuilder('pv')
      .select('pv.path', 'path')
      .addSelect('COUNT(*)', 'pv_count')
      .addSelect('COUNT(DISTINCT pv.session_id)', 'uv_count')
      .groupBy('pv.path')
      .orderBy('pv_count', 'DESC')
      .limit(limit);

    if (since) qb.where('pv.created_at >= :since', { since });

    const raw = await qb.getRawMany<{ path: string; pv_count: string; uv_count: string }>();
    return raw.map((r) => ({
      path: r.path,
      pv: parseInt(r.pv_count, 10),
      uv: parseInt(r.uv_count, 10),
    }));
  }

  async getSources(days?: number) {
    const since = this.sinceDate(days);
    const qb = this.pvRepo
      .createQueryBuilder('pv')
      .select('pv.referrer_source', 'source')
      .addSelect('COUNT(*)', 'count')
      .groupBy('pv.referrer_source')
      .orderBy('count', 'DESC');

    if (since) qb.where('pv.created_at >= :since', { since });

    const raw = await qb.getRawMany<{ source: string; count: string }>();
    return raw.map((r) => ({ source: r.source, count: parseInt(r.count, 10) }));
  }

  async getDevices(days?: number) {
    const since = this.sinceDate(days);
    const qb = this.pvRepo
      .createQueryBuilder('pv')
      .select('pv.device_type', 'deviceType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('pv.device_type')
      .orderBy('count', 'DESC');

    if (since) qb.where('pv.created_at >= :since', { since });

    const raw = await qb.getRawMany<{ deviceType: string; count: string }>();
    return raw.map((r) => ({ deviceType: r.deviceType ?? 'desktop', count: parseInt(r.count, 10) }));
  }

  async getGeo(days?: number, limit = 10) {
    const since = this.sinceDate(days);
    const qb = this.pvRepo
      .createQueryBuilder('pv')
      .select('pv.country', 'country')
      .addSelect('COUNT(*)', 'count')
      .where('pv.country IS NOT NULL')
      .groupBy('pv.country')
      .orderBy('count', 'DESC')
      .limit(limit);

    if (since) qb.andWhere('pv.created_at >= :since', { since });

    const raw = await qb.getRawMany<{ country: string; count: string }>();
    return raw.map((r) => ({ country: r.country, count: parseInt(r.count, 10) }));
  }
}
