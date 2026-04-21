import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { DataSource, DataSourceOptions } from "typeorm";
import { envs } from "../config/envs";
import { EnableUnaccentExtension20260411000000 } from "./migrations/20260411000000-enable-unaccent-extension";
import { AddListingIndexes20260412000000 } from "./migrations/20260412000000-add-listing-indexes";
import { CreateUbigeoTables20260421010000 } from "./migrations/20260421010000-create-ubigeo-tables";

export const getBaseTypeOrmOptions = (): DataSourceOptions => ({
  type: "postgres",
  host: envs.db.host,
  port: envs.db.port,
  username: envs.db.username,
  password: envs.db.password,
  database: envs.db.name,
  logging: true,
});

export const getTypeOrmModuleOptions = (): TypeOrmModuleOptions => ({
  ...getBaseTypeOrmOptions(),
  synchronize: true, // SOLO EN DESARROLLO
  autoLoadEntities: true,
});

export const getMigrationDataSourceOptions = (): DataSourceOptions => ({
  ...getBaseTypeOrmOptions(),
  entities: [],
  migrationsTableName: "typeorm_migrations",
  migrations: [
    EnableUnaccentExtension20260411000000,
    AddListingIndexes20260412000000,
    CreateUbigeoTables20260421010000,
  ],
});

export const migrationDataSource = new DataSource(getMigrationDataSourceOptions());
