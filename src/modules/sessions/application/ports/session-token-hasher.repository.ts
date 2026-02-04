export const SESSION_TOKEN_HASHER = Symbol('SESSION_TOKEN_HASHER');

export interface SessionTokenHasherRepository {
  hash(token: string): Promise<string>;
  verify(hash: string, token: string): Promise<boolean>;
}
