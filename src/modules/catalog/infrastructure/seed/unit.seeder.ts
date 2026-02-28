import { DataSource } from 'typeorm';
import { UnitEntity } from '../../adapters/out/persistence/typeorm/entities/unit.entity';

export const seedUnits = async (dataSource: DataSource): Promise<void> => {
  const repo = dataSource.getRepository(UnitEntity);

  const unitsToSeed = [
    { code: 'BJ', name: 'BALDE' },
    { code: 'BLL', name: 'BARRILES' },
    { code: '4A', name: 'BOBINAS' },
    { code: 'BG', name: 'BOLSA' },
    { code: 'BO', name: 'BOTELLAS' },
    { code: 'BX', name: 'CAJA' },
    { code: 'PK', name: 'CAJETILLA' },
    { code: 'CT', name: 'CARTONES' },
    { code: 'CMK', name: 'CENTIMETRO CUADRADO' },
    { code: 'CMQ', name: 'CENTIMETRO CUBICO' },
    { code: 'CMT', name: 'CENTIMETRO LINEAL' },
    { code: 'CEN', name: 'CIENTO DE UNIDADES' },
    { code: 'CY', name: 'CILINDRO' },
    { code: 'CJ', name: 'CONOS' },
    { code: 'DS', name: 'DISPLAY' },
    { code: 'DZN', name: 'DOCENA' },
    { code: 'DZP', name: 'DOCENA POR 10**6' },
    { code: 'BL', name: 'FARDO' },
    { code: 'JR', name: 'FRASCO' },
    { code: 'GLI', name: 'GALON INGLES (4,545956L)' },
    { code: 'GLL', name: 'GALONES' },
    { code: 'GRM', name: 'GRAMOS' },
    { code: 'LEF', name: 'HOJA' },
    { code: 'HUR', name: 'HORA' },
    { code: 'CS', name: 'JABA' },
    { code: 'SET', name: 'JUEGO' },
    { code: 'KGM', name: 'KILOGRAMO' },
    { code: 'KWH', name: 'KILOVATIO HORA' },
    { code: 'KT', name: 'KIT' },
    { code: 'CA', name: 'LATA' },
    { code: 'LBR', name: 'LIBRA' },
    { code: 'LTR', name: 'LITRO' },
    { code: 'MWH', name: 'MEGAWATT HORA' },
    { code: 'MTR', name: 'METRO' },
    { code: 'MTK', name: 'METRO CUADRADO' },
    { code: 'MTQ', name: 'METRO CUBICO' },
    { code: 'MGM', name: 'MILIGRAMO' },
    { code: 'MLT', name: 'MILILITRO' },
    { code: 'MMT', name: 'MILIMETRO' },
    { code: 'MMK', name: 'MILIMETRO CUADRADO' },
    { code: 'MMQ', name: 'MILIMETRO CUBICO' },
    { code: 'MIL', name: 'MILLARES' },
    { code: 'UM', name: 'MILLON DE UNIDADES' },
    { code: 'ONZ', name: 'ONZA' },
    { code: 'PA', name: 'PACK' },
    { code: 'PF', name: 'PALETAS' },
    { code: 'PKE', name: 'PAQUETE' },
    { code: 'PR', name: 'PAR' },
    { code: 'FOT', name: 'PIES' },
    { code: 'FTK', name: 'PIES CUADRADOS' },
    { code: 'FTQ', name: 'PIES CUBICOS' },
    { code: 'C62', name: 'PIEZAS' },
    { code: 'PG', name: 'PLACAS' },
    { code: 'ST', name: 'PLIEGO' },
    { code: 'INH', name: 'PULGADAS' },
    { code: 'RO', name: 'ROLLO' },
    { code: 'ZZ', name: 'SERVICIO' },
    { code: 'DR', name: 'TAMBOR' },
    { code: 'SR', name: 'TIRA' },
    { code: 'TNE', name: 'TONELADAS' },
    { code: 'TU', name: 'TUBO' },
    { code: 'NIU', name: 'UNIDADES' },
    { code: 'RD', name: 'VARILLA' },
    { code: 'YDK', name: 'YARDA CUADRADA' },
    { code: 'YRD', name: 'YARDAS' },
  ];

  for (const unit of unitsToSeed) {
    const exists = await repo.findOneBy({ code: unit.code });
    if (exists) {
      console.log(`Unit ${unit.code} ya existe, omitiendo...`);
      continue;
    }
    await repo.save(repo.create(unit));
    console.log(`Unit insertada: ${unit.code}`);
  }
};
