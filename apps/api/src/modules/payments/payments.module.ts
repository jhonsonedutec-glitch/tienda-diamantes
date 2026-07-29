import { Module } from '@nestjs/common';
import { PaymentProviderRegistry } from './payment-provider.registry';
import { ManualPaymentProvider } from './providers/manual-payment.provider';

@Module({
  providers: [ManualPaymentProvider, PaymentProviderRegistry],
  exports: [PaymentProviderRegistry],
})
export class PaymentsModule {}
