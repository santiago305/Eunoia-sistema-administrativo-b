import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { envs } from 'src/infrastructure/config/envs';
import { AccessControlService } from 'src/modules/access-control/application/services/access-control.service';
import { SESSION_READ_REPOSITORY, SessionReadRepository } from 'src/modules/sessions/application/ports/session-read.repository';

@Injectable()
export class SocketSessionAuthorizerService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(SESSION_READ_REPOSITORY) private readonly sessions: SessionReadRepository,
    private readonly accessControl: AccessControlService,
  ) {}

  async authorize(handshake: { headers?: { cookie?: string }; auth?: unknown }, namespace: 'sale-orders' | 'workflow-reactivity') {
    const token = this.readCookie(handshake.headers?.cookie, 'access_token');
    if (!token) return null;
    let payload: { sub?: string; sessionId?: string };
    try {
      payload = this.jwt.verify(token, { secret: envs.jwt.secret, issuer: envs.jwt.issuer });
    } catch {
      return null;
    }
    if (!payload?.sub || !payload.sessionId) return null;
    const session = await this.sessions.findByIdAndUserId(payload.sessionId, payload.sub);
    if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
    const permissions = new Set(await this.accessControl.getEffectivePermissions(payload.sub));
    const required = namespace === 'workflow-reactivity' ? 'sale_orders.workflows.manage' : 'sale_orders.view';
    if (!permissions.has('*') && !permissions.has(required)) return null;
    return { userId: payload.sub, sessionId: payload.sessionId };
  }

  private readCookie(header: string | undefined, name: string) {
    return header?.split(';').map((part) => part.trim()).map((part) => part.split('='))
      .find(([key]) => key === name)?.[1] ?? null;
  }
}
