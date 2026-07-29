import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsInt()
  @Min(1)
  diamonds!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bonusDiamonds?: number;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  imageUrl?: string;

  @Matches(/^\d{1,10}(\.\d{1,2})?$/, { message: 'Precio inválido.' })
  salePrice!: string;
}
