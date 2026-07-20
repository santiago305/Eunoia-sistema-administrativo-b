import { DataSource } from 'typeorm';
import { runBaseSeed } from './seed-base';
import { seedUser } from '../../modules/users/infrastructure/seed/user.seeder';
import { seedUbigeo } from '../../modules/ubigeo/infrastructure/seed/ubigeo.seeder';
import { seedUnits } from '../../modules/product-catalog/infrastructure/seed/unit.seeder';

jest.mock('../../modules/users/infrastructure/seed/user.seeder', () => ({ seedUser: jest.fn() }));
jest.mock('../../modules/ubigeo/infrastructure/seed/ubigeo.seeder', () => ({ seedUbigeo: jest.fn() }));
jest.mock('../../modules/product-catalog/infrastructure/seed/unit.seeder', () => ({ seedUnits: jest.fn() }));

describe('runBaseSeed', () => {
  const dataSource = {
    isInitialized: true,
    initialize: jest.fn(),
    destroy: jest.fn(),
  } as unknown as DataSource;

  beforeEach(() => {
    jest.clearAllMocks();
    (dataSource as { isInitialized: boolean }).isInitialized = true;
    (dataSource.initialize as jest.Mock).mockImplementation(async () => {
      (dataSource as { isInitialized: boolean }).isInitialized = true;
    });
  });

  it('carga sólo los datos obligatorios y conserva un datasource administrado por el llamador', async () => {
    await runBaseSeed(dataSource);

    expect(seedUser).toHaveBeenCalledWith(dataSource);
    expect(seedUbigeo).toHaveBeenCalledWith(dataSource);
    expect(seedUnits).toHaveBeenCalledWith(dataSource);
    expect(dataSource.destroy).not.toHaveBeenCalled();
  });

  it('inicializa y cierra su propio datasource incluso cuando un seeder falla', async () => {
    (dataSource as { isInitialized: boolean }).isInitialized = false;
    (seedUbigeo as jest.Mock).mockRejectedValueOnce(new Error('dataset inválido'));

    await expect(runBaseSeed(dataSource)).rejects.toThrow('dataset inválido');

    expect(dataSource.initialize).toHaveBeenCalledTimes(1);
    expect(seedUnits).not.toHaveBeenCalled();
    expect(dataSource.destroy).toHaveBeenCalledTimes(1);
  });
});
