import { GetAuthUserUseCase } from "../use-cases/get-auth-user.usecase";
import { LoginAuthUseCase } from "../use-cases/login-auth.usecase";
import { RefreshAuthUseCase } from "../use-cases/refresh.auth.usecase";
import { VerifyUserPasswordBySessionUseCase } from "../use-cases/verify-user-password-by-session.usecase";

export const authUsecasesProviders = [
  LoginAuthUseCase,
  RefreshAuthUseCase,
  GetAuthUserUseCase,
  VerifyUserPasswordBySessionUseCase,
];
