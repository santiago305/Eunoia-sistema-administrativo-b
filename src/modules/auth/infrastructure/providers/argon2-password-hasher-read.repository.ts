import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import {
  PasswordHasherReadRepository,
} from 'src/modules/auth/application/ports/password-hasher-read.repository';

@Injectable()
export class Argon2PasswordHasherReadRepository implements PasswordHasherReadRepository {
  async hash(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}
