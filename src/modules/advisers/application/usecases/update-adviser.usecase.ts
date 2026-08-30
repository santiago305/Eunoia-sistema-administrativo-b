import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';

@Injectable()
export class UpdateAdviserUsecase {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}
  async execute(userId: string, input: { name?: string; email?: string }) {
    const user = await this.users.findOne({ where: { id: userId, deleted: false } });
    if (!user) throw new NotFoundException('Asesor no encontrado');
    if (input.name?.trim()) user.name = input.name.trim();
    if (input.email?.trim()) user.email = input.email.trim();
    const saved = await this.users.save(user);
    return { id: saved.id, name: saved.name, email: saved.email };
  }
}
