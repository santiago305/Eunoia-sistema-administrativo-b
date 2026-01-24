export type AuthTokenPayload = {
  sub: string;
  role: string;
};

export const TOKEN_READ_REPOSITORY = Symbol('TOKEN_READ_REPOSITORY');

export interface TokenReadRepository {
  signAccessToken(payload: AuthTokenPayload): string;
  signRefreshToken(payload: AuthTokenPayload): string;
}
