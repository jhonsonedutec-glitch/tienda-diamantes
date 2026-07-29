import { BadRequestException, Injectable } from '@nestjs/common';
import type { PaymentMethod } from '@ff/database';
import type { PaymentProviderAdapter } from './payment-provider.types';
import { ManualPaymentProvider } from './providers/manual-payment.provider';

@Injectable()
export class PaymentProviderRegistry {
  private readonly providers: PaymentProviderAdapter[];

  constructor(manual: ManualPaymentProvider) {
    this.providers = [manual];
  }

  forMethod(method: PaymentMethod): PaymentProviderAdapter {
    const provider = this.providers.find((item) => item.supports(method));
    if (!provider) {
      throw new BadRequestException(
        'El método de pago todavía no está habilitado.',
      );
    }
    return provider;
  }
}
