import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdviserEntity } from '../../adapters/out/persistence/typeorm/entities/adviser.entity';

@Injectable()
export class SetAdviserActiveUsecase {
  constructor(@InjectRepository(AdviserEntity) private readonly advisers: Repository<AdviserEntity>) {}
  async execute(userId: string, isActive: boolean) {
    const adviser = await this.advisers.findOneBy({ userId });
    if (!adviser) throw new NotFoundException('Asesor no encontrado');
    adviser.isActive = isActive;
    await this.advisers.save(adviser);
    return { id: userId, isActive };
  }
}
