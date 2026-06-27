import { UNIT_OF_WORK } from 'src/shared/domain/ports/unit-of-work.port';
import { TypeormUnitOfWork } from 'src/shared/infrastructure/typeorm/typeorm.unit-of-work';
import { recurringPurchasesModuleProviders } from './container';

describe('recurringPurchasesModuleProviders', () => {
  it('registers the unit of work provider required by recurring payable generation', () => {
    expect(recurringPurchasesModuleProviders).toContainEqual({
      provide: UNIT_OF_WORK,
      useClass: TypeormUnitOfWork,
    });
  });
});
