import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentMethod,
  PaymentProvider,
} from '@ff/database';
import type {
  CreatedPaymentIntent,
  CreatePaymentIntentInput,
  PaymentProviderAdapter,
} from '../payment-provider.types';

@Injectable()
export class ManualPaymentProvider implements PaymentProviderAdapter {
  constructor(private readonly config: ConfigService) {}

  supports(method: PaymentMethod): boolean {
    return method === PaymentMethod.YAPE || method === PaymentMethod.BCP;
  }

  async createIntent(
    input: CreatePaymentIntentInput,
  ): Promise<CreatedPaymentIntent> {
    if (input.method === PaymentMethod.YAPE) {
      return {
        provider: PaymentProvider.YAPE_MANUAL,
        instructions: {
          method: 'YAPE',
          amount: input.amount,
          currency: input.currency,
          holder: this.config.get<string>('YAPE_HOLDER') ?? '',
          phone: this.config.get<string>('YAPE_PHONE') ?? '',
          qrUrl: this.config.get<string>('YAPE_QR_URL') ?? '',
        },
      };
    }

    return {
      provider: PaymentProvider.BCP_MANUAL,
      instructions: {
        method: 'BCP',
        amount: input.amount,
        currency: input.currency,
        holder: this.config.get<string>('BCP_HOLDER') ?? '',
        account: this.config.get<string>('BCP_ACCOUNT') ?? '',
        cci: this.config.get<string>('BCP_CCI') ?? '',
      },
    };
  }
}
