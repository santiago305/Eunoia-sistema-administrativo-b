import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { DataSource, DataSourceOptions } from "typeorm";
import { envs } from "../config/envs";
import { EnableUnaccentExtension20260411000000 } from "./migrations/20260411000000-enable-unaccent-extension";
import { AddListingIndexes20260412000000 } from "./migrations/20260412000000-add-listing-indexes";
import { CreateUbigeoTables20260421010000 } from "./migrations/20260421010000-create-ubigeo-tables";
import { CreateClientsCore20260519000000 } from "./migrations/20260519000000-create-clients-core";
import { CreateCorporateMessagingCore20260511000000 } from "./migrations/20260511000000-create-corporate-messaging-core";
import { CreatePacksCore20260519010000 } from "./migrations/20260519010000-create-packs-core";
import { AddClientsNoneDocType20260520020000 } from "./migrations/20260520020000-add-clients-none-doc-type";
import { AddUserRoleManagementAudit20260526000000 } from "./migrations/20260526000000-add-user-role-management-audit";
import { AddMasterSuperAdministratorRole20260527000000 } from "./migrations/20260527000000-add-master-super-administrator-role";

export const getBaseTypeOrmOptions = (): DataSourceOptions => ({
  type: "postgres",
  host: envs.db.host,
  port: envs.db.port,
  username: envs.db.username,
  password: envs.db.password,
  database: envs.db.name,
  logging: false,
});

export const getTypeOrmModuleOptions = (): TypeOrmModuleOptions => ({
  ...getBaseTypeOrmOptions(),
  synchronize: envs.nodeEnv === "development",
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
    CreateCorporateMessagingCore20260511000000,
    CreateClientsCore20260519000000,
    CreatePacksCore20260519010000,
    AddClientsNoneDocType20260520020000,
    AddUserRoleManagementAudit20260526000000,
    AddMasterSuperAdministratorRole20260527000000,
  ],
});

export const migrationDataSource = new DataSource(getMigrationDataSourceOptions());
