import type {
  Currency,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  Prisma,
} from '@ff/database';

export interface CreatePaymentIntentInput {
  publicCode: string;
  method: PaymentMethod;
  amount: string;
  currency: Currency;
  expiresAt: Date;
}

export interface CreatedPaymentIntent {
  provider: PaymentProvider;
  providerReference?: string;
  checkoutUrl?: string;
  qrContent?: string;
  instructions: Prisma.InputJsonObject;
}

export interface VerifyWebhookInput {
  headers: Record<string, string | string[] | undefined>;
  rawBody: Buffer;
}

export interface VerifiedPaymentEvent {
  providerEventId: string;
  eventType: string;
  providerReference: string;
  status: PaymentStatus;
  amount: string;
  currency: Currency;
  payload: Prisma.InputJsonObject;
}

export interface PaymentProviderAdapter {
  supports(method: PaymentMethod): boolean;
  createIntent(input: CreatePaymentIntentInput): Promise<CreatedPaymentIntent>;
  verifyWebhook?(input: VerifyWebhookInput): Promise<VerifiedPaymentEvent>;
  queryStatus?(providerReference: string): Promise<PaymentStatus>;
}
