import { Injectable } from '@nestjs/common';
import {
  FulfillmentStatus,
  PaymentStatus,
  prisma,
} from '@ff/database';

@Injectable()
export class DashboardService {
  async summary() {
    const [totalOrders, reviewRequired, readyForDispatch, completed, revenue] =
      await Promise.all([
        prisma.order.count(),
        prisma.order.count({
          where: { paymentStatus: PaymentStatus.REVIEW_REQUIRED },
        }),
        prisma.order.count({
          where: {
            paymentStatus: PaymentStatus.PAID,
            fulfillmentStatus: FulfillmentStatus.MANUAL_REVIEW,
          },
        }),
        prisma.order.count({
          where: { fulfillmentStatus: FulfillmentStatus.COMPLETED },
        }),
        prisma.order.aggregate({
          where: { paymentStatus: PaymentStatus.PAID },
          _sum: { priceSnapshot: true },
        }),
      ]);

    return {
      totalOrders,
      reviewRequired,
      readyForDispatch,
      completed,
      paidRevenuePen: revenue._sum.priceSnapshot?.toFixed(2) ?? '0.00',
    };
  }
}
