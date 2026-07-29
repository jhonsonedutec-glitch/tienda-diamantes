import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RejectPaymentDto {
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;
}

export class CompleteOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  providerReference?: string;
}
