import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

export type StorageAccess =
  | { kind: 'redirect'; url: string }
  | { kind: 'buffer'; buffer: Buffer; mimeType: string; fileName: string };

@Injectable()
export class StorageService {
  private readonly driver: 'local' | 'supabase';
  private readonly localBasePath: string;
  private readonly bucket: string;
  private readonly supabase?: SupabaseClient;

  constructor(private readonly config: ConfigService) {
    this.driver =
      config.get<string>('STORAGE_DRIVER') === 'supabase'
        ? 'supabase'
        : 'local';
    this.localBasePath = resolve(
      process.cwd(),
      config.get<string>('LOCAL_STORAGE_PATH') ?? '../../data/uploads',
    );
    this.bucket =
      config.get<string>('SUPABASE_RECEIPTS_BUCKET') ?? 'payment-receipts';

    if (this.driver === 'supabase') {
      const url = config.get<string>('SUPABASE_URL');
      const serviceKey = config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
      if (!url || !serviceKey) {
        throw new Error(
          'SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorios para STORAGE_DRIVER=supabase.',
        );
      }
      this.supabase = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
  }

  async uploadReceipt(input: {
    orderId: string;
    originalName: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<string> {
    const sanitized = basename(input.originalName).replace(
      /[^a-zA-Z0-9._-]/g,
      '_',
    );
    const path = `orders/${input.orderId}/${randomUUID()}-${sanitized}`;

    if (this.driver === 'supabase') {
      const { error } = await this.supabase!.storage
        .from(this.bucket)
        .upload(path, input.buffer, {
          contentType: input.mimeType,
          upsert: false,
        });
      if (error) {
        throw new BadRequestException(`No se pudo guardar el comprobante: ${error.message}`);
      }
      return path;
    }

    const fullPath = resolve(this.localBasePath, path);
    if (!fullPath.startsWith(this.localBasePath)) {
      throw new BadRequestException('Ruta de almacenamiento inválida.');
    }
    await mkdir(resolve(fullPath, '..'), { recursive: true });
    await writeFile(fullPath, input.buffer, { flag: 'wx' });
    return path;
  }

  async getAccess(input: {
    storagePath: string;
    mimeType: string;
    originalName: string;
  }): Promise<StorageAccess> {
    if (this.driver === 'supabase') {
      const { data, error } = await this.supabase!.storage
        .from(this.bucket)
        .createSignedUrl(input.storagePath, 300, {
          download: input.originalName,
        });
      if (error || !data?.signedUrl) {
        throw new NotFoundException('No se pudo abrir el comprobante.');
      }
      return { kind: 'redirect', url: data.signedUrl };
    }

    const fullPath = resolve(this.localBasePath, input.storagePath);
    if (!fullPath.startsWith(this.localBasePath)) {
      throw new BadRequestException('Ruta de almacenamiento inválida.');
    }

    try {
      const buffer = await readFile(fullPath);
      return {
        kind: 'buffer',
        buffer,
        mimeType: input.mimeType,
        fileName: input.originalName,
      };
    } catch {
      throw new NotFoundException('Comprobante no encontrado.');
    }
  }
}
