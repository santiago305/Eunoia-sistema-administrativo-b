export const PASSWORD_HASHER_READ_REPOSITORY = Symbol('PASSWORD_HASHER_READ_REPOSITORY');

export interface PasswordHasherReadRepository {
  hash(password: string): Promise<string>;
  verify(hash: string, plain: string): Promise<boolean>;
}
