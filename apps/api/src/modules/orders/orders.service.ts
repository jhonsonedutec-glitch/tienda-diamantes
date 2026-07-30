import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Currency,
  FulfillmentProvider,
  FulfillmentStatus,
  PaymentMethod,
  PaymentStatus,
  ReceiptReviewStatus,
  prisma,
} from '@ff/database';
import {
  ALLOWED_RECEIPT_MIME_TYPES,
  NOTIFICATION_TEMPLATES,
} from '@ff/shared';
import {
  generatePublicCode,
  generateTrackingToken,
  hashTrackingToken,
  safeJson,
  verifyTrackingToken,
} from '../../common/crypto';
import { normalizePeruvianPhone } from '../../common/phone';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentProviderRegistry } from '../payments/payment-provider.registry';
import { StorageService } from '../storage/storage.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly config: ConfigService,
    private readonly providers: PaymentProviderRegistry,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateOrderDto) {
    if (!([PaymentMethod.YAPE, PaymentMethod.BCP] as PaymentMethod[]).includes(dto.paymentMethod)) {
      throw new BadRequestException(
        'En esta versión solo están habilitados Yape y BCP.',
      );
    }

    let phone: string;
    try {
      phone = normalizePeruvianPhone(dto.phone);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }

    const now = new Date();
    const product = await prisma.product.findFirst({
      where: { id: dto.productId, active: true },
      include: {
        prices: {
          where: {
            currency: Currency.PEN,
            validFrom: { lte: now },
            OR: [{ validUntil: null }, { validUntil: { gt: now } }],
          },
          orderBy: { validFrom: 'desc' },
          take: 1,
        },
      },
    });

    if (!product || !product.prices[0]) {
      throw new NotFoundException('Paquete no disponible.');
    }

    const ttlMinutes = Number(this.config.get('ORDER_TTL_MINUTES') ?? 30);
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60_000);
    const trackingToken = generateTrackingToken();
    const publicCode = generatePublicCode();
    const price = product.prices[0].salePrice.toFixed(2);
    const provider = this.providers.forMethod(dto.paymentMethod);
    const createdIntent = await provider.createIntent({
      publicCode,
      method: dto.paymentMethod,
      amount: price,
      currency: Currency.PEN,
      expiresAt,
    });

    const order = await prisma.order.create({
      data: {
        publicCode,
        trackingTokenHash: hashTrackingToken(trackingToken),
        customerName: dto.customerName?.trim() || null,
        customerPhone: phone,
        whatsappConsent: dto.whatsappConsent,
        playerUid: dto.playerUid,
        productId: product.id,
        productNameSnapshot: product.name,
        diamondsSnapshot: product.diamonds,
        bonusDiamondsSnapshot: product.bonusDiamonds,
        priceSnapshot: price,
        currency: Currency.PEN,
        paymentMethod: dto.paymentMethod,
        expiresAt,
        paymentIntents: {
          create: {
            provider: createdIntent.provider,
            providerReference: createdIntent.providerReference,
            amount: price,
            currency: Currency.PEN,
            checkoutUrl: createdIntent.checkoutUrl,
            qrContent: createdIntent.qrContent,
            instructions: createdIntent.instructions,
            expiresAt,
          },
        },
      },
      include: { paymentIntents: true },
    });

    await this.notifications.enqueue({
      orderId: order.id,
      recipient: order.customerPhone,
      template: NOTIFICATION_TEMPLATES.orderCreated,
      whatsappConsent: order.whatsappConsent,
      payload: {
        publicCode: order.publicCode,
        amount: order.priceSnapshot.toFixed(2),
        productName: order.productNameSnapshot,
      },
    });

    return {
      publicCode: order.publicCode,
      trackingToken,
      expiresAt: order.expiresAt.toISOString(),
      paymentInstructions: createdIntent.instructions,
    };
  }

  async getPublic(publicCode: string, trackingToken?: string) {
    if (!trackingToken) {
      throw new ForbiddenException('Token de seguimiento requerido.');
    }

    const order = await prisma.order.findUnique({
      where: { publicCode },
      include: {
        receipts: { orderBy: { createdAt: 'desc' }, take: 1 },
        paymentIntents: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!order) throw new NotFoundException('Pedido no encontrado.');
    if (!verifyTrackingToken(trackingToken, order.trackingTokenHash)) {
      throw new ForbiddenException('Token de seguimiento inválido.');
    }

    const latestReceipt = order.receipts[0];
    return {
      publicCode: order.publicCode,
      customerName: order.customerName,
      playerUid: order.playerUid,
      productName: order.productNameSnapshot,
      diamonds: order.diamondsSnapshot,
      bonusDiamonds: order.bonusDiamondsSnapshot,
      amount: order.priceSnapshot.toFixed(2),
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      expiresAt: order.expiresAt.toISOString(),
      paidAt: order.paidAt?.toISOString() ?? null,
      completedAt: order.completedAt?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
      paymentInstructions:
        order.paymentIntents[0]?.instructions ?? null,
      latestReceipt: latestReceipt
        ? {
            reviewStatus: latestReceipt.reviewStatus,
            rejectionReason: latestReceipt.rejectionReason,
            createdAt: latestReceipt.createdAt.toISOString(),
          }
        : null,
    };
  }

  async uploadReceipt(input: {
    publicCode: string;
    trackingToken?: string;
    originalName: string;
    mimeType: string;
    buffer: Buffer;
    operationNumber?: string;
    paymentDate?: string;
  }) {
    if (!input.trackingToken) {
      throw new ForbiddenException('Token de seguimiento requerido.');
    }

    if (!(ALLOWED_RECEIPT_MIME_TYPES as readonly string[]).includes(input.mimeType)) {
      throw new BadRequestException(
        'Solo se aceptan imágenes JPG/PNG o archivos PDF.',
      );
    }

    const maxBytes =
      Number(this.config.get('MAX_RECEIPT_MB') ?? 5) * 1024 * 1024;
    if (input.buffer.length > maxBytes) {
      throw new BadRequestException('El comprobante excede el tamaño permitido.');
    }

    const order = await prisma.order.findUnique({
      where: { publicCode: input.publicCode },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado.');
    if (!verifyTrackingToken(input.trackingToken, order.trackingTokenHash)) {
      throw new ForbiddenException('Token de seguimiento inválido.');
    }
    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('El pago ya fue aprobado.');
    }
    if (order.fulfillmentStatus === FulfillmentStatus.COMPLETED) {
      throw new BadRequestException('El pedido ya fue completado.');
    }

    const paymentDate = input.paymentDate
      ? new Date(input.paymentDate)
      : undefined;
    if (paymentDate && Number.isNaN(paymentDate.getTime())) {
      throw new BadRequestException('Fecha de pago inválida.');
    }

    const operationNumber = input.operationNumber?.trim() || undefined;
    if (operationNumber) {
      const duplicate = await prisma.paymentReceipt.findFirst({
        where: {
          operationNumber,
          order: { paymentMethod: order.paymentMethod },
          NOT: { orderId: order.id },
        },
        select: { id: true },
      });
      if (duplicate) {
        throw new BadRequestException(
          'El número de operación ya fue registrado en otro pedido.',
        );
      }
    }

    const storagePath = await this.storage.uploadReceipt({
      orderId: order.id,
      originalName: input.originalName,
      mimeType: input.mimeType,
      buffer: input.buffer,
    });

    const receipt = await prisma.$transaction(async (tx) => {
      const created = await tx.paymentReceipt.create({
        data: {
          orderId: order.id,
          storagePath,
          originalName: input.originalName,
          mimeType: input.mimeType,
          sizeBytes: input.buffer.length,
          operationNumber: operationNumber ?? null,
          paymentDate,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: PaymentStatus.REVIEW_REQUIRED },
      });
      await tx.paymentIntent.updateMany({
        where: { orderId: order.id },
        data: { status: PaymentStatus.REVIEW_REQUIRED },
      });
      return created;
    });

    await this.notifications.enqueue({
      orderId: order.id,
      recipient: order.customerPhone,
      template: NOTIFICATION_TEMPLATES.receiptReceived,
      whatsappConsent: order.whatsappConsent,
      payload: { publicCode: order.publicCode },
    });

    return {
      receiptId: receipt.id,
      reviewStatus: receipt.reviewStatus,
      message: 'Comprobante recibido y pendiente de revisión.',
    };
  }

  async listAdmin(filters: { paymentStatus?: string; fulfillmentStatus?: string }) {
    const orders = await prisma.order.findMany({
      where: {
        paymentStatus: filters.paymentStatus as PaymentStatus | undefined,
        fulfillmentStatus:
          filters.fulfillmentStatus as FulfillmentStatus | undefined,
      },
      include: {
        receipts: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return orders.map((order) => ({
      id: order.id,
      publicCode: order.publicCode,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      playerUid: order.playerUid,
      productName: order.productNameSnapshot,
      diamonds: order.diamondsSnapshot,
      bonusDiamonds: order.bonusDiamondsSnapshot,
      amount: order.priceSnapshot.toFixed(2),
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      completedAt: order.completedAt,
      latestReceipt: order.receipts[0]
        ? {
            id: order.receipts[0].id,
            operationNumber: order.receipts[0].operationNumber,
            reviewStatus: order.receipts[0].reviewStatus,
            rejectionReason: order.receipts[0].rejectionReason,
            createdAt: order.receipts[0].createdAt,
          }
        : null,
    }));
  }

  async approvePayment(input: {
    orderId: string;
    adminId: string;
    ipAddress?: string;
  }) {
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: { receipts: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado.');
    const receipt = order.receipts[0];
    if (order.paymentStatus === PaymentStatus.PAID) return this.getAdmin(order.id);

    const updated = await prisma.$transaction(async (tx) => {
      if (receipt) {
        await tx.paymentReceipt.update({
          where: { id: receipt.id },
          data: {
            reviewStatus: ReceiptReviewStatus.APPROVED,
            reviewedById: input.adminId,
            reviewedAt: new Date(),
            rejectionReason: null,
          },
        });
      }
      await tx.paymentIntent.updateMany({
        where: { orderId: order.id },
        data: { status: PaymentStatus.PAID, paidAt: new Date() },
      });
      const result = await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          fulfillmentStatus: FulfillmentStatus.MANUAL_REVIEW,
          paidAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          adminId: input.adminId,
          orderId: order.id,
          action: 'PAYMENT_APPROVED',
          entityType: 'Order',
          entityId: order.id,
          previousData: safeJson({
            paymentStatus: order.paymentStatus,
            fulfillmentStatus: order.fulfillmentStatus,
          }),
          newData: safeJson({
            paymentStatus: result.paymentStatus,
            fulfillmentStatus: result.fulfillmentStatus,
          }),
          ipAddress: input.ipAddress,
        },
      });
      return result;
    });

    await this.notifications.enqueue({
      orderId: updated.id,
      recipient: updated.customerPhone,
      template: NOTIFICATION_TEMPLATES.paymentApproved,
      whatsappConsent: updated.whatsappConsent,
      payload: {
        publicCode: updated.publicCode,
        amount: updated.priceSnapshot.toFixed(2),
      },
    });

    return this.getAdmin(updated.id);
  }

  async rejectPayment(input: {
    orderId: string;
    adminId: string;
    reason: string;
    ipAddress?: string;
  }) {
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: { receipts: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado.');
    const receipt = order.receipts[0];
    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('No se puede rechazar un pago ya aprobado.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (receipt) {
        await tx.paymentReceipt.update({
          where: { id: receipt.id },
          data: {
            reviewStatus: ReceiptReviewStatus.REJECTED,
            reviewedById: input.adminId,
            reviewedAt: new Date(),
            rejectionReason: input.reason,
          },
        });
      }
      await tx.paymentIntent.updateMany({
        where: { orderId: order.id },
        data: { status: PaymentStatus.REJECTED },
      });
      const result = await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.REJECTED,
          fulfillmentStatus: FulfillmentStatus.NOT_READY,
        },
      });
      await tx.auditLog.create({
        data: {
          adminId: input.adminId,
          orderId: order.id,
          action: 'PAYMENT_REJECTED',
          entityType: 'Order',
          entityId: order.id,
          previousData: safeJson({ paymentStatus: order.paymentStatus }),
          newData: safeJson({
            paymentStatus: result.paymentStatus,
            reason: input.reason,
          }),
          ipAddress: input.ipAddress,
        },
      });
      return result;
    });

    await this.notifications.enqueue({
      orderId: updated.id,
      recipient: updated.customerPhone,
      template: NOTIFICATION_TEMPLATES.paymentRejected,
      whatsappConsent: updated.whatsappConsent,
      payload: {
        publicCode: updated.publicCode,
        reason: input.reason,
      },
    });

    return this.getAdmin(updated.id);
  }

  async complete(input: {
    orderId: string;
    adminId: string;
    providerReference?: string;
    ipAddress?: string;
  }) {
    const order = await prisma.order.findUnique({ where: { id: input.orderId } });
    if (!order) throw new NotFoundException('Pedido no encontrado.');
    if (order.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException('El pago debe estar aprobado primero.');
    }
    if (order.fulfillmentStatus === FulfillmentStatus.COMPLETED) {
      return this.getAdmin(order.id);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const attempts = await tx.fulfillmentAttempt.count({
        where: { orderId: order.id },
      });
      await tx.fulfillmentAttempt.create({
        data: {
          orderId: order.id,
          provider: FulfillmentProvider.MANUAL,
          providerReference: input.providerReference,
          attemptNumber: attempts + 1,
          status: FulfillmentStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
      const result = await tx.order.update({
        where: { id: order.id },
        data: {
          fulfillmentStatus: FulfillmentStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          adminId: input.adminId,
          orderId: order.id,
          action: 'ORDER_COMPLETED',
          entityType: 'Order',
          entityId: order.id,
          previousData: safeJson({
            fulfillmentStatus: order.fulfillmentStatus,
          }),
          newData: safeJson({
            fulfillmentStatus: result.fulfillmentStatus,
            providerReference: input.providerReference,
          }),
          ipAddress: input.ipAddress,
        },
      });
      return result;
    });

    await this.notifications.enqueue({
      orderId: updated.id,
      recipient: updated.customerPhone,
      template: NOTIFICATION_TEMPLATES.orderCompleted,
      whatsappConsent: updated.whatsappConsent,
      payload: {
        publicCode: updated.publicCode,
        productName: updated.productNameSnapshot,
      },
    });

    return this.getAdmin(updated.id);
  }

  async getAdmin(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        receipts: { orderBy: { createdAt: 'desc' } },
        fulfillmentAttempts: { orderBy: { attemptNumber: 'desc' } },
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 30 },
      },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado.');
    return {
      ...order,
      priceSnapshot: order.priceSnapshot.toFixed(2),
    };
  }

  async getLatestReceiptAccess(orderId: string) {
    const receipt = await prisma.paymentReceipt.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
    if (!receipt) throw new NotFoundException('Comprobante no encontrado.');
    return this.storage.getAccess({
      storagePath: receipt.storagePath,
      mimeType: receipt.mimeType,
      originalName: receipt.originalName,
    });
  }

  async deleteTestOrder(id: string, adminId: string) {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Pedido no encontrado.');
    
    await prisma.$transaction(async (tx) => {
      // Eliminar logs de auditoría para no dejar basura si es una prueba
      await tx.auditLog.deleteMany({ where: { orderId: id } });
      await tx.order.delete({ where: { id } });
    });
    
    return { success: true };
  }

  async getMetrics(period: 'week' | 'month' | 'semester' | 'all') {
    const now = new Date();
    let startDate: Date | undefined;
    
    if (period === 'week') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    } else if (period === 'semester') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    }

    const result = await prisma.order.aggregate({
      where: {
        paymentStatus: PaymentStatus.PAID,
        ...(startDate ? { paidAt: { gte: startDate } } : {}),
      },
      _sum: {
        priceSnapshot: true,
      },
      _count: {
        id: true,
      }
    });

    return {
      revenuePen: result._sum.priceSnapshot?.toNumber() || 0,
      totalOrders: result._count.id,
      period,
    };
  }
}
