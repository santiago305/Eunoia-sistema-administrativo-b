import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { AdviserEntity } from '../../adapters/out/persistence/typeorm/entities/adviser.entity';

export type AdviserOutput = {
  id: string;
  name: string;
  email: string;
};

@Injectable()
export class ListAdvisersUsecase {
  constructor(
    @InjectRepository(AdviserEntity)
    private readonly advisers: Repository<AdviserEntity>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async execute(): Promise<AdviserOutput[]> {
    const rows = await this.advisers.find();
    const userIds = rows.map((row) => row.userId);
    if (!userIds.length) return [];

    const users = await this.users.find({
      where: { id: In(userIds), deleted: false },
      order: { name: 'ASC' },
    });
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
    }));
  }
}
