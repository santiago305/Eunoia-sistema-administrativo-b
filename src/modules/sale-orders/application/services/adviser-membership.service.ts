import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdviserEntity } from 'src/modules/advisers/adapters/out/persistence/typeorm/entities/adviser.entity';

@Injectable()
export class AdviserMembershipService {
  constructor(
    @InjectRepository(AdviserEntity)
    private readonly advisers: Repository<AdviserEntity>,
  ) {}

  async assertIsAdviser(userId?: string | null): Promise<void> {
    if (!userId) return;
    if (!(await this.advisers.exist({ where: { userId } }))) {
      throw new BadRequestException('El usuario asignado no es asesor');
    }
  }
}
