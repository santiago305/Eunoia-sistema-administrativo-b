import {
  BadRequestException,
  ConflictException,
  Inject,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { SOURCE_REPOSITORY, SourceRepository } from "src/modules/sources/domain/ports/source.repository";
import { UpdateSourceInput } from "../../dtos/source/input/update.input";
import { SourceNotFoundError } from "../../errors/source-not-found.error";
import { InvalidSourceError } from "src/modules/sources/domain/errors/invalid-source.error";

export class UpdateSourceUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SOURCE_REPOSITORY)
    private readonly sourceRepo: SourceRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: UpdateSourceInput): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const current = await this.sourceRepo.findById(input.sourceId, tx);
      if (!current) {
        throw new NotFoundException(new SourceNotFoundError().message);
      }

      if (!current.isActive) {
        throw new BadRequestException("No puedes actualizar una fuente deshabilitada");
      }

      try {
        const next = current.update({
          name: input.name,
          detail: input.detail,
          updatedAt: this.clock.now(),
        });

        const updated = await this.sourceRepo.update(
          {
            sourceId: next.sourceId.value,
            name: next.name,
            detail: next.detail,
            updatedAt: next.updatedAt,
          },
          tx,
        );

        if (!updated) {
          throw new BadRequestException("No se pudo actualizar la fuente");
        }
      } catch (error) {
        if (error instanceof InvalidSourceError) {
          throw new BadRequestException(error.message);
        }

        if (
          error instanceof BadRequestException ||
          error instanceof NotFoundException ||
          error instanceof ConflictException
        ) {
          throw error;
        }

        if ((error as any)?.code === "23505") {
          throw new ConflictException("Fuente ya registrada");
        }

        throw new InternalServerErrorException("No se pudo actualizar la fuente");
      }

      return { message: "Fuente actualizada con exito" };
    });
  }
}

