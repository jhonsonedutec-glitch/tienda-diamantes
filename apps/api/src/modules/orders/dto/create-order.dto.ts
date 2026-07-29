import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaymentMethod } from '@ff/database';

export class CreateOrderDto {
  @IsUUID()
  productId!: string;

  @IsString()
  @Matches(/^\d{6,20}$/, {
    message: 'El UID debe contener entre 6 y 20 dígitos.',
  })
  playerUid!: string;

  @IsString()
  @MinLength(9)
  @MaxLength(20)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerName?: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsBoolean()
  whatsappConsent!: boolean;
}
