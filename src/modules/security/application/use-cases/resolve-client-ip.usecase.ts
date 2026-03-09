import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ResolveClientIpUseCase {
  execute(req: Request): string {
    const candidate = req.ip || req.socket?.remoteAddress || 'unknown';
    return this.normalizeIp(candidate);
  }

  normalizeIp(rawIp: string): string {
    let ip = (rawIp || '').trim().toLowerCase();
    if (!ip) return 'unknown';

    if (ip.startsWith('::ffff:')) {
      ip = ip.replace('::ffff:', '');
    }

    if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) {
      ip = ip.split(':')[0];
    }

    return ip || 'unknown';
  }
}

