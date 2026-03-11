import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { envs } from 'src/infrastructure/config/envs';

@Injectable()
export class ResolveClientIpUseCase {
  execute(req: Request): string {
    const isDevelopment = envs.nodeEnv === 'development';
    const forwardedForHeader = req.headers['x-forwarded-for'];
    const forwardedFor = Array.isArray(forwardedForHeader) ? forwardedForHeader[0] : forwardedForHeader;
    const firstForwardedIp = forwardedFor?.split(',')[0]?.trim();

    const candidate = isDevelopment
      ? firstForwardedIp || req.ip || req.socket?.remoteAddress || 'unknown'
      : req.ip || req.socket?.remoteAddress || 'unknown';
    const resolvedIp = this.normalizeIp(candidate);

    if (isDevelopment) {
      console.log('[security][ip-resolver]', {
        path: req.path,
        method: req.method,
        xForwardedFor: forwardedFor ?? null,
        reqIp: req.ip ?? null,
        remoteAddress: req.socket?.remoteAddress ?? null,
        resolvedIp,
      });
    }

    return resolvedIp;
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

