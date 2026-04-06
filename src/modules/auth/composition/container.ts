import { Provider } from "@nestjs/common";
import { PASSWORD_HASHER_READ_REPOSITORY } from "../application/ports/password-hasher-read.repository";
import { TOKEN_READ_REPOSITORY } from "../application/ports/token-read.repository";
import { authUsecasesProviders } from "../application/providers/auth-usecases.providers";
import { Argon2PasswordHasherReadRepository } from "../infrastructure/providers/argon2-password-hasher-read.repository";
import { JwtTokenReadRepository } from "../infrastructure/providers/jwt-token-read.repository";
import { JwtRefreshStrategy } from "../infrastructure/providers/strategy/jwt-refresh.strategy";
import { JwtStrategy } from "../infrastructure/providers/strategy/jwt.strategy";

export const authModuleProviders: Provider[] = [
  JwtStrategy,
  JwtRefreshStrategy,
  ...authUsecasesProviders,
  { provide: TOKEN_READ_REPOSITORY, useClass: JwtTokenReadRepository },
  { provide: PASSWORD_HASHER_READ_REPOSITORY, useClass: Argon2PasswordHasherReadRepository },
];
