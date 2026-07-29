import { Injectable, NotFoundException } from '@nestjs/common';
import { Currency, prisma } from '@ff/database';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  async listPublic() {
    const now = new Date();
    const products = await prisma.product.findMany({
      where: { active: true },
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
      orderBy: [{ diamonds: 'asc' }, { bonusDiamonds: 'asc' }],
    });

    return products
      .filter((product) => product.prices[0])
      .map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        diamonds: product.diamonds,
        bonusDiamonds: product.bonusDiamonds,
        imageUrl: product.imageUrl,
        price: product.prices[0].salePrice.toFixed(2),
        currency: product.prices[0].currency,
      }));
  }

  async listAdmin() {
    const products = await prisma.product.findMany({
      include: {
        prices: {
          orderBy: { validFrom: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      diamonds: product.diamonds,
      bonusDiamonds: product.bonusDiamonds,
      imageUrl: product.imageUrl,
      active: product.active,
      salePrice: product.prices[0]?.salePrice.toFixed(2) ?? null,
      currency: product.prices[0]?.currency ?? Currency.PEN,
      createdAt: product.createdAt,
    }));
  }

  create(dto: CreateProductDto) {
    return prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        diamonds: dto.diamonds,
        bonusDiamonds: dto.bonusDiamonds ?? 0,
        imageUrl: dto.imageUrl,
        prices: {
          create: {
            currency: Currency.PEN,
            salePrice: dto.salePrice,
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Producto no encontrado.');

    return prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          diamonds: dto.diamonds,
          bonusDiamonds: dto.bonusDiamonds,
          imageUrl: dto.imageUrl,
          active: dto.active,
        },
      });

      if (dto.salePrice) {
        const now = new Date();
        await tx.productPrice.updateMany({
          where: {
            productId: id,
            currency: Currency.PEN,
            validUntil: null,
          },
          data: { validUntil: now },
        });
        await tx.productPrice.create({
          data: {
            productId: id,
            currency: Currency.PEN,
            salePrice: dto.salePrice,
            validFrom: now,
          },
        });
      }

      return product;
    });
  }
}
