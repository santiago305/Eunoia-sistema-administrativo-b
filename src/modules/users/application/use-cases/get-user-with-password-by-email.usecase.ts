import { Inject, Injectable } from '@nestjs/common';
import { USER_READ_REPOSITORY, UserReadRepository } from 'src/modules/users/application/ports/user-read.repository';

@Injectable()
export class GetUserWithPasswordByEmailUseCase {
  constructor(
    @Inject(USER_READ_REPOSITORY)
    private readonly userReadRepository: UserReadRepository,
  ) {}

  async execute(email: string): Promise<{
    id: string;
    email: string;
    password: string;
    role: { description: string };
    failedLoginAttempts: number;
    lockoutLevel: number;
    lockedUntil: Date | null;
    securityDisabledAt: Date | null;
  } | null> {
    const user = await this.userReadRepository.findWithPasswordByEmail(email);
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      password: user.password,
      role: { description: user.roleDescription },
      failedLoginAttempts: user.failedLoginAttempts,
      lockoutLevel: user.lockoutLevel,
      lockedUntil: user.lockedUntil,
      securityDisabledAt: user.securityDisabledAt,
    };
  }
}
