import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateClientUsecase } from 'src/modules/clients/application/usecases/client/create.usecase';
import { UpdateClientUsecase } from 'src/modules/clients/application/usecases/client/update.usecase';
import {
  CLIENT_REPOSITORY,
  ClientRepository,
} from 'src/modules/clients/domain/ports/client.repository';
import { ClientUpdatedEvent } from 'src/modules/clients/integration/client/ports/client-realtime.port';
import { TransactionContext } from 'src/shared/domain/ports/transaction-context.port';
import { SaleOrderClientCommand } from '../dtos/unified-sale-order.input';

@Injectable()
export class SaleOrderClientCommandService {
  constructor(
    @Inject(CLIENT_REPOSITORY)
    private readonly clients: ClientRepository,
    private readonly createClient: CreateClientUsecase,
    private readonly updateClient: UpdateClientUsecase,
  ) {}

  async execute(
    command: SaleOrderClientCommand,
    tx: TransactionContext,
  ): Promise<{ clientId: string; event: ClientUpdatedEvent | null }> {
    if (command.mode === 'existing') {
      const client = await this.clients.findById(command.id, tx);
      if (!client) throw new NotFoundException('Cliente no encontrado');
      if (!client.isActive) {
        throw new BadRequestException('El cliente seleccionado esta deshabilitado');
      }
      return { clientId: client.clientId.value, event: null };
    }

    if (command.mode === 'create') {
      const clientId = await this.createClient.executeInTransaction(
        command.data,
        tx,
      );
      return { clientId, event: null };
    }

    const result = await this.updateClient.executeInTransaction(
      { ...command.data, clientId: command.id },
      tx,
    );
    return { clientId: result.clientId, event: result.event };
  }
}
