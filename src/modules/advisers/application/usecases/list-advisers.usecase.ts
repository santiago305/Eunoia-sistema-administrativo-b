import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { AdviserEntity } from '../../adapters/out/persistence/typeorm/entities/adviser.entity';

export type AdviserOutput = {
  id: string;
  name: string;
  email: string;
  isActive?: boolean;
  assignedOrders?: number;
  soldTotal?: number;
  collectedTotal?: number;
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
    const rows = await this.advisers.find({ where: { isActive: true } });
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
      isActive: true,
    }));
  }

  async listCandidates(): Promise<AdviserOutput[]> {
    const [activeAdvisers, users] = await Promise.all([
      this.advisers.find({ where: { isActive: true } }),
      this.users.find({
        where: { deleted: false },
        order: { name: 'ASC' },
      }),
    ]);
    const activeAdviserIds = new Set(
      activeAdvisers.map((adviser) => adviser.userId),
    );

    return users
      .filter((user) => !activeAdviserIds.has(user.id))
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
      }));
  }
}
