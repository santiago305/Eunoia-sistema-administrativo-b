import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { envs } from 'src/infrastructure/config/envs';
import {
  AuthTokenPayload,
  TokenReadRepository,
} from 'src/modules/auth/application/ports/token-read.repository';

@Injectable()
export class JwtTokenReadRepository implements TokenReadRepository {
  constructor(private readonly jwtService: JwtService) {}

  signAccessToken(payload: AuthTokenPayload): string {
    return this.jwtService.sign(payload, {
      expiresIn: envs.jwt.expiresIn,
      issuer: envs.jwt.issuer,
    });
  }

  signRefreshToken(payload: AuthTokenPayload): string {
    return this.jwtService.sign(payload, {
      expiresIn: envs.jwt.refreshExpiresIn,
      issuer: envs.jwt.issuer,
    });
  }
}
