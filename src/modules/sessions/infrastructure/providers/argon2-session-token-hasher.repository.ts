import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { SessionTokenHasherRepository } from '../../application/ports/session-token-hasher.repository';

@Injectable()
export class Argon2SessionTokenHasherRepository implements SessionTokenHasherRepository {
  hash(token: string): Promise<string> {
    return argon2.hash(token);
  }

  verify(hash: string, token: string): Promise<boolean> {
    return argon2.verify(hash, token);
  }
}
