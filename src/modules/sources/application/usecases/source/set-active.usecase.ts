import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { SOURCE_REPOSITORY, SourceRepository } from "src/modules/sources/domain/ports/source.repository";
import { SetSourceActiveInput } from "../../dtos/source/input/set-active.input";
import { SourceNotFoundError } from "../../errors/source-not-found.error";

export class SetSourceActiveUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SOURCE_REPOSITORY)
    private readonly sourceRepo: SourceRepository,
  ) {}

  async execute(input: SetSourceActiveInput): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const current = await this.sourceRepo.findById(input.sourceId, tx);
      if (!current) {
        throw new NotFoundException(new SourceNotFoundError().message);
      }

      try {
        await this.sourceRepo.setActive(input.sourceId, input.isActive, tx);
      } catch {
        throw new BadRequestException("No se pudo actualizar el estado de la fuente");
      }

      return { message: "Estado de la fuente actualizado" };
    });
  }
}

