import { BadRequestException, Inject, InternalServerErrorException } from "@nestjs/common";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { SourceFactory } from "src/modules/sources/domain/factories/source.factory";
import { SOURCE_REPOSITORY, SourceRepository } from "src/modules/sources/domain/ports/source.repository";
import { CreateSourceInput } from "../../dtos/source/input/create.input";
import { InvalidSourceError } from "src/modules/sources/domain/errors/invalid-source.error";

export class CreateSourceUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SOURCE_REPOSITORY)
    private readonly sourceRepo: SourceRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: CreateSourceInput): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      await this.executeInTransaction(input, tx);
      return { message: "Fuente creada con exito" };
    });
  }

  async executeInTransaction(input: CreateSourceInput, tx: TransactionContext): Promise<string> {
      const now = this.clock.now();
      let source;
      try {
        source = SourceFactory.createSource({
          name: input.name,
          detail: input.detail,
          isActive: input.isActive ?? true,
          createdAt: now,
        });
      } catch (error) {
        if (error instanceof InvalidSourceError) {
          throw new BadRequestException(error.message);
        }
        throw error;
      }

      try {
        await this.sourceRepo.create(source, tx);
      } catch {
        throw new InternalServerErrorException("No se pudo crear la fuente");
      }

      return source.sourceId.value;
  }
}

