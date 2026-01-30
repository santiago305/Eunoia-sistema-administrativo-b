import { UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';

const DEVICE_MAX_AGE = 1000 * 60 * 60 * 24 * 365; // 1 año
const DEVICE_COOKIE = 'device_id';

export function getOrCreateDeviceId(req: Request, res: Response): string {
    let deviceId =
    req.signedCookies?.[DEVICE_COOKIE] ||
    req.cookies?.[DEVICE_COOKIE];

  if (!deviceId) {
    deviceId = randomUUID();
    res.cookie(DEVICE_COOKIE, deviceId, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: DEVICE_MAX_AGE, // 1h
      signed: true,
    });
  }
  return deviceId;
}

export function getDeviceIdOrThrow(req: Request): string {
  const deviceId =
    req.signedCookies?.[DEVICE_COOKIE] ||
    req.cookies?.[DEVICE_COOKIE];

  if (!deviceId) {
    throw new UnauthorizedException('device_id faltante (cookie)');
  }

  return deviceId;
}
