export enum PaymentMethod {
  WECHAT = 'wechat',
  ALIPAY = 'alipay',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export interface Payment {
  id: string;
  userId: string;
  creditsAmount: number;
  priceFen: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  externalOrderId?: string;
  createdAt: Date;
  paidAt?: Date;
}

export interface CreateOrderDto {
  packageId: string;
  paymentMethod: PaymentMethod;
}

export interface CreateOrderResult {
  orderId: string;
  payUrl?: string;
  qrCode?: string;
}
