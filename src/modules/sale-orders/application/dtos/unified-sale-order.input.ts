import { CreateClientInput } from 'src/modules/clients/application/dtos/client/input/create.input';
import { UpdateClientInput } from 'src/modules/clients/application/dtos/client/input/update.input';

export type SaleOrderClientCommand =
  | { mode: 'existing'; id: string }
  | { mode: 'create'; data: CreateClientInput }
  | {
      mode: 'update';
      id: string;
      data: Omit<UpdateClientInput, 'clientId'>;
    };
