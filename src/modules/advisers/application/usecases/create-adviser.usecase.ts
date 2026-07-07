import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { AdviserEntity } from '../../adapters/out/persistence/typeorm/entities/adviser.entity';
import { AdviserOutput } from './list-advisers.usecase';

@Injectable()
export class CreateAdviserUsecase {
  constructor(
    @InjectRepository(AdviserEntity)
    private readonly advisers: Repository<AdviserEntity>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async execute(input: { userId: string }): Promise<AdviserOutput> {
    const user = await this.users.findOne({
      where: { id: input.userId, deleted: false },
    });
    if (!user) throw new NotFoundException('Usuario activo no encontrado');

    const existing = await this.advisers.findOneBy({
      userId: input.userId,
    });
    if (!existing) {
      await this.advisers.save({ userId: input.userId });
    }

    return { id: user.id, name: user.name, email: user.email };
  }
}
