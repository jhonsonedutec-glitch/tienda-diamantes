export const QUEUE_NAMES = {
  notifications: 'notifications',
  fulfillment: 'fulfillment',
} as const;

export const NOTIFICATION_TEMPLATES = {
  orderCreated: 'ORDER_CREATED',
  receiptReceived: 'RECEIPT_RECEIVED',
  paymentApproved: 'PAYMENT_APPROVED',
  paymentRejected: 'PAYMENT_REJECTED',
  orderCompleted: 'ORDER_COMPLETED',
} as const;

export type NotificationTemplate =
  (typeof NOTIFICATION_TEMPLATES)[keyof typeof NOTIFICATION_TEMPLATES];

export const ALLOWED_RECEIPT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
] as const;

export interface PublicProduct {
  id: string;
  name: string;
  description: string | null;
  diamonds: number;
  bonusDiamonds: number;
  imageUrl: string | null;
  price: string;
  currency: 'PEN' | 'USDT';
}

export interface CreateOrderResponse {
  publicCode: string;
  trackingToken: string;
  expiresAt: string;
  paymentInstructions: {
    method: 'YAPE' | 'BCP';
    amount: string;
    currency: 'PEN';
    holder: string;
    phone?: string;
    qrUrl?: string;
    account?: string;
    cci?: string;
  };
}

export interface PublicOrderView {
  publicCode: string;
  customerName: string | null;
  playerUid: string;
  productName: string;
  diamonds: number;
  bonusDiamonds: number;
  amount: string;
  currency: 'PEN' | 'USDT';
  paymentMethod: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  expiresAt: string;
  paidAt: string | null;
  completedAt: string | null;
  createdAt: string;
  latestReceipt: {
    reviewStatus: string;
    rejectionReason: string | null;
    createdAt: string;
  } | null;
}
