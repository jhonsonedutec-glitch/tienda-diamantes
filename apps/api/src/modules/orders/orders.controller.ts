import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { AdminJwtPayload } from '../auth/jwt.strategy';
import { CreateOrderDto } from './dto/create-order.dto';
import { CompleteOrderDto, RejectPaymentDto } from './dto/review-payment.dto';
import { OrdersService } from './orders.service';

function fieldValue(fields: Record<string, any> | undefined, key: string) {
  const value = fields?.[key];
  if (!value) return undefined;
  if (Array.isArray(value)) return String(value[0]?.value ?? '');
  return String(value.value ?? '');
}

@ApiTags('orders')
@Controller()
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('orders')
  create(@Body() dto: CreateOrderDto) {
    return this.orders.create(dto);
  }

  @Get('orders/:publicCode')
  getPublic(
    @Param('publicCode') publicCode: string,
    @Headers('x-order-token') token?: string,
  ) {
    return this.orders.getPublic(publicCode, token);
  }

  @Post('orders/:publicCode/receipt')
  async uploadReceipt(
    @Param('publicCode') publicCode: string,
    @Headers('x-order-token') token: string | undefined,
    @Req() request: FastifyRequest,
  ) {
    const file = await request.file();
    if (!file) {
      throw new BadRequestException('Debe adjuntar un comprobante.');
    }
    const buffer = await file.toBuffer();
    const fields = file.fields as Record<string, any>;

    return this.orders.uploadReceipt({
      publicCode,
      trackingToken: token,
      originalName: file.filename,
      mimeType: file.mimetype,
      buffer,
      operationNumber: fieldValue(fields, 'operationNumber'),
      paymentDate: fieldValue(fields, 'paymentDate'),
    });
  }

  @ApiBearerAuth()
  @UseGuards(AdminAuthGuard)
  @Get('admin/orders')
  listAdmin(
    @Query('paymentStatus') paymentStatus?: string,
    @Query('fulfillmentStatus') fulfillmentStatus?: string,
  ) {
    return this.orders.listAdmin({ paymentStatus, fulfillmentStatus });
  }

  @ApiBearerAuth()
  @UseGuards(AdminAuthGuard)
  @Get('admin/orders/:id')
  getAdmin(@Param('id') id: string) {
    return this.orders.getAdmin(id);
  }

  @ApiBearerAuth()
  @UseGuards(AdminAuthGuard)
  @Patch('admin/orders/:id/payment/approve')
  approve(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminJwtPayload,
    @Req() request: FastifyRequest,
  ) {
    return this.orders.approvePayment({
      orderId: id,
      adminId: admin.sub,
      ipAddress: request.ip,
    });
  }

  @ApiBearerAuth()
  @UseGuards(AdminAuthGuard)
  @Patch('admin/orders/:id/payment/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectPaymentDto,
    @CurrentAdmin() admin: AdminJwtPayload,
    @Req() request: FastifyRequest,
  ) {
    return this.orders.rejectPayment({
      orderId: id,
      adminId: admin.sub,
      reason: dto.reason,
      ipAddress: request.ip,
    });
  }

  @ApiBearerAuth()
  @UseGuards(AdminAuthGuard)
  @Patch('admin/orders/:id/complete')
  complete(
    @Param('id') id: string,
    @Body() dto: CompleteOrderDto,
    @CurrentAdmin() admin: AdminJwtPayload,
    @Req() request: FastifyRequest,
  ) {
    return this.orders.complete({
      orderId: id,
      adminId: admin.sub,
      providerReference: dto.providerReference,
      ipAddress: request.ip,
    });
  }

  @ApiBearerAuth()
  @UseGuards(AdminAuthGuard)
  @Get('admin/orders/:id/receipt')
  async receipt(
    @Param('id') id: string,
    @Res() reply: FastifyReply,
  ) {
    const access = await this.orders.getLatestReceiptAccess(id);
    if (access.kind === 'redirect') {
      return reply.redirect(access.url);
    }
    return reply
      .header('Content-Type', access.mimeType)
      .header(
        'Content-Disposition',
        `inline; filename="${access.fileName.replace(/"/g, '')}"`,
      )
      .send(access.buffer);
  }

  @ApiBearerAuth()
  @UseGuards(AdminAuthGuard)
  @Delete('admin/orders/:id')
  deleteTestOrder(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminJwtPayload,
  ) {
    return this.orders.deleteTestOrder(id, admin.sub);
  }

  @ApiBearerAuth()
  @UseGuards(AdminAuthGuard)
  @Get('admin/metrics')
  getMetrics(@Query('period') period?: string) {
    return this.orders.getMetrics((period as any) || 'all');
  }
}
