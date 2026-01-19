import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.vo';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  existsByEmail(email: Email): Promise<boolean>;
  existsByIdAndDeleted(id: string, deleted: boolean): Promise<boolean>;
  updateDeleted(id: string, deleted: boolean): Promise<void>;
  save(user: User): Promise<User>;
}
