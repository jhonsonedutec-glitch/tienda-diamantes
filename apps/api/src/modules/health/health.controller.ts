import { Controller, Get } from '@nestjs/common';
import { prisma } from '@ff/database';

@Controller('health')
export class HealthController {
  @Get()
  async check() {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
