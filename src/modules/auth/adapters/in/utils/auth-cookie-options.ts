import type { CookieOptions, Response } from 'express';
import { envs } from 'src/infrastructure/config/envs';

const baseCookieOptions = (): CookieOptions => ({
  secure: envs.nodeEnv === 'production',
  sameSite: 'lax',
  path: '/',
});

/**
 * Cookies privadas de autenticacion.
 * No reciben domain, por lo que permanecen limitadas al host de la API.
 */
export const authCookieOptions = (maxAge?: number): CookieOptions => ({
  ...baseCookieOptions(),
  httpOnly: true,
  ...(typeof maxAge === 'number' ? { maxAge } : {}),
});

/**
 * Cookie CSRF compartida entre www.eunoiacosmetica.com
 * y api.eunoiacosmetica.com en produccion.
 *
 * En desarrollo COOKIE_DOMAIN estara vacio y la propiedad domain se omitira.
 */
export const csrfCookieOptions = (maxAge?: number): CookieOptions => ({
  ...baseCookieOptions(),
  httpOnly: false,
  ...(envs.cookieDomain ? { domain: envs.cookieDomain } : {}),
  ...(typeof maxAge === 'number' ? { maxAge } : {}),
});

/**
 * Configuracion antigua host-only, usada para eliminar cookies
 * creadas antes de incorporar COOKIE_DOMAIN.
 */
const legacyCsrfCookieOptions = (): CookieOptions => ({
  ...baseCookieOptions(),
  httpOnly: false,
});

export const clearLegacyHostOnlyCsrfCookie = (res: Response): void => {
  if (!envs.cookieDomain) return;

  res.clearCookie('csrf_token', legacyCsrfCookieOptions());
};

export const clearAuthResponseCookies = (res: Response): void => {
  res.clearCookie('refresh_token', authCookieOptions());
  res.clearCookie('access_token', authCookieOptions());

  // Elimina la cookie nueva compartida.
  res.clearCookie('csrf_token', csrfCookieOptions());

  // Elimina una posible cookie antigua limitada a api.eunoiacosmetica.com.
  if (envs.cookieDomain) {
    res.clearCookie('csrf_token', legacyCsrfCookieOptions());
  }
};
