export enum CreditTransactionType {
  PURCHASE = 'purchase',
  CONSUME = 'consume',
  REFUND = 'refund',
  BONUS = 'bonus',
}

export interface CreditBalance {
  userId: string;
  balance: number;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: CreditTransactionType;
  referenceId?: string;
  description: string;
  createdAt: Date;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceFen: number;
  discountPercent?: number;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'pkg_10k', name: '基础版', credits: 10000, priceFen: 10000 },
  { id: 'pkg_50k', name: '标准版', credits: 50000, priceFen: 50000 },
  { id: 'pkg_200k', name: '专业版', credits: 200000, priceFen: 200000 },
  { id: 'pkg_500k', name: '企业版', credits: 500000, priceFen: 450000, discountPercent: 10 },
  { id: 'pkg_1m', name: '旗舰版', credits: 1000000, priceFen: 800000, discountPercent: 20 },
];

export const CREDIT_COSTS: Record<string, number> = {
  'sora-2_text2video': 300,
  'sora-2_img2video': 300,
  'veo3_text2video': 500,
  'veo3_img2video': 500,
  'veo3-fast_text2video': 250,
  'veo2_text2video': 200,
  'grok-video_text2video': 200,
  'grok-video_img2video': 200,
  'nano-banana_text2image': 60,
  'nano-banana-pro_text2image': 80,
  'nano-banana-2_text2image': 80,
  'grok-image_text2image': 60,
  'chirp-v55_create': 50,
  'Lyria 3 Pro_create': 80,
  'chat_per_1k_tokens': 10,
};
