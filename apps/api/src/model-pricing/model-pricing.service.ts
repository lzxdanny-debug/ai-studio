import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * 精确映射配置：ai-studio 本地 model ID → Mountsea API 路径 + 匹配条件
 *
 * 依据 price.json 抓包数据（2026-04），按 ai-studio 实际调用的 API 路径确定费用。
 * matchPartial=true 时只需 rule.match 包含 matchParams 中的所有 k/v 即可（允许 rule 有更多字段）。
 */
interface PricingTarget {
  local: string;          // ai-studio 的 model id
  path: string;           // Mountsea 的 API 路径
  matchParams: Record<string, string | number>; // 要在 rule.match 中精确包含的字段
}

const PRICING_TARGETS: PricingTarget[] = [
  // ── Video — Veo (gemini) ──────────────────────────────────────────────────
  // local 值必须与 VideoModel 枚举的实际字符串值一致（见 packages/shared/src/types/task.types.ts）
  // VideoModel.VEO3_QUALITY 不存在，Mountsea 也没有 veo3_quality 规则，前端硬编码兜底
  { local: 'veo3',      path: '/gemini/video/generate', matchParams: { model: 'veo3_fast' } },     // VEO3 = 'veo3'，无 quality 规则，用 fast 价
  { local: 'veo3-fast', path: '/gemini/video/generate', matchParams: { model: 'veo3_fast' } },     // VEO3_FAST = 'veo3-fast'
  { local: 'veo31',     path: '/gemini/video/generate', matchParams: { model: 'veo31_quality' } }, // VEO31 = 'veo31'
  { local: 'veo31-fast',path: '/gemini/video/generate', matchParams: { model: 'veo31_fast' } },    // VEO31_FAST = 'veo31-fast'
  { local: 'veo2',      path: '/gemini/video/generate', matchParams: { model: 'veo2_quality' } },  // VEO2 = 'veo2'

  // ── Video — Sora ──────────────────────────────────────────────────────────
  // ai-studio 调用 /sora/video/generate（非 /v2），cost=15
  { local: 'sora-2', path: '/sora/video/generate', matchParams: { model: 'sora-2' } },

  // ── Image — Nano Banana (gemini) ─────────────────────────────────────────
  // ImageModel 枚举值 = 'nano-banana' / 'nano-banana-pro' / 'nano-banana-2'，与 local 一致
  // nano-banana-pro / nano-banana-2 有分辨率分档；取 4K（最高档）
  { local: 'nano-banana',     path: '/gemini/image/generate', matchParams: { model: 'nano-banana-fast' } },
  { local: 'nano-banana-pro', path: '/gemini/image/generate', matchParams: { model: 'nano-banana-pro', resolution: '4K' } },
  { local: 'nano-banana-2',   path: '/gemini/image/generate', matchParams: { model: 'nano-banana-2',   resolution: '4K' } },

  // ── Image — Grok (xai) ───────────────────────────────────────────────────
  // ImageModel.GROK_IMAGE = 'grok-image'
  { local: 'grok-image', path: '/xai/images', matchParams: { model: 'grok-imagine-image' } },

  // ── Music — Suno ─────────────────────────────────────────────────────────
  // MusicModel.SUNO_V55 = 'chirp-v55', MusicModel.SUNO_V50 = 'chirp-v50'
  // Suno 按 task 类型计费，两者 create 任务均为 40 积分，无法区分版本
  { local: 'chirp-v50', path: '/suno/v2/generate', matchParams: { task: 'create/extend/upload_extend/upload_cover/cover/use_styles_lyrics/replace_section/add_instrumental/add_vocals/gen_stem_two/mashup/sample/inspiration' } },
  { local: 'chirp-v55', path: '/suno/v2/generate', matchParams: { task: 'create/extend/upload_extend/upload_cover/cover/use_styles_lyrics/replace_section/add_instrumental/add_vocals/gen_stem_two/mashup/sample/inspiration' } },

  // ── Music — Lyria (producer) ─────────────────────────────────────────────
  // MusicModel.LYRIA3_PRO = 'Lyria 3 Pro'，Mountsea 无此规则，前端保持硬编码 80 兜底
];

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  data: Record<string, number>;
  fetchedAt: number;
}

@Injectable()
export class ModelPricingService {
  private readonly logger = new Logger(ModelPricingService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private cache: CacheEntry | null = null;

  constructor(private config: ConfigService) {
    this.baseUrl = config.get<string>('MOUNTSEA_USER_API_URL', 'https://dk.mountsea.ai');
    this.apiKey  = config.get<string>('MOUNTSEA_API_KEY', '');
  }

  async getModelPricing(): Promise<Record<string, number>> {
    if (this.cache && Date.now() - this.cache.fetchedAt < CACHE_TTL_MS) {
      return this.cache.data;
    }
    const data = await this.fetchFromMountsea();
    this.cache = { data, fetchedAt: Date.now() };
    return data;
  }

  /** 清除内存缓存，下次请求时重新从 Mountsea 拉取 */
  invalidateCache(): void {
    this.cache = null;
    this.logger.log('Model pricing cache invalidated');
  }

  private async fetchFromMountsea(): Promise<Record<string, number>> {
    const result: Record<string, number> = {};

    if (!this.apiKey) {
      this.logger.warn('MOUNTSEA_API_KEY not configured — returning empty model pricing');
      return result;
    }

    // 使用全量接口，一次拿到所有 API 定价，避免多次请求
    let allApis: any[] = [];
    try {
      const { data } = await axios.get<any[]>(
        `${this.baseUrl}/api/microservice/api/price`,
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          timeout: 15000,
        },
      );
      allApis = data ?? [];
    } catch (err: any) {
      this.logger.error(`Failed to fetch Mountsea pricing: ${err?.message}`);
      return result;
    }

    // 构建 path → rules 的索引
    const pathRules = new Map<string, any[]>();
    for (const api of allApis) {
      const path: string = api.path ?? '';
      if (!pathRules.has(path)) pathRules.set(path, []);
      const rules: any[] = api.param_cost_rules ?? [];
      pathRules.get(path)!.push(...rules);
    }

    // 按 PRICING_TARGETS 精确匹配
    for (const target of PRICING_TARGETS) {
      const rules = pathRules.get(target.path) ?? [];
      const matched = this.findMatchingRule(rules, target.matchParams);
      if (matched !== null) {
        // 若已有值（同 local 多个 target），保留最大
        if (!result[target.local] || matched > result[target.local]) {
          result[target.local] = matched;
        }
      }
    }

    this.logger.log(`Model pricing refreshed: ${JSON.stringify(result)}`);
    return result;
  }

  /**
   * 在规则列表中找到 match 字段包含所有 targetParams 的规则，返回 cost。
   * 未找到返回 null。
   */
  private findMatchingRule(
    rules: any[],
    targetParams: Record<string, string | number>,
  ): number | null {
    for (const rule of rules) {
      const match: Record<string, any> = rule.match ?? {};
      const cost: number | null = rule.cost;
      if (!cost || cost <= 0) continue;

      const isMatch = Object.entries(targetParams).every(
        ([k, v]) => match[k] !== undefined && String(match[k]) === String(v),
      );
      if (isMatch) return cost;
    }
    return null;
  }
}
