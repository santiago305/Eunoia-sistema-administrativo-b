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
import { CreateLogisticsCatalogs20260523000000 } from "./migrations/20260523000000-create-logistics-catalogs";
import { CreateAgenciesCore20260524000000 } from "./migrations/20260524000000-create-agencies-core";
import { CreateSaleOrdersCore20260525000000 } from "./migrations/20260525000000-create-sale-orders-core";
import { AddUserRoleManagementAudit20260526000000 } from "./migrations/20260526000000-add-user-role-management-audit";
import { AddMasterSuperAdministratorRole20260527000000 } from "./migrations/20260527000000-add-master-super-administrator-role";
import { SaleOrdersAgencyDetail20260527000000 } from "./migrations/20260527000000-sale-orders-agency-detail";
import { AllowSuperAdminWithoutRole20260528000000 } from "./migrations/20260528000000-allow-super-admin-without-role";
import { CreateUserGrantablePermissions20260528010000 } from "./migrations/20260528010000-create-user-grantable-permissions";
import { CreateUserManageableRoles20260528020000 } from "./migrations/20260528020000-create-user-manageable-roles";
import { SaleOrdersWarehouseNullable20260530000000 } from "./migrations/20260530000000-sale-orders-warehouse-nullable";
import { CreateAgencySubsidiaries20260603000000 } from "./migrations/20260603000000-create-agency-subsidiaries";
import { CreateWorkflowEngine20260606010000 } from "./migrations/20260606010000-create-workflow-engine";
import { AddWorkflowStateNodePositions20260606020000 } from "./migrations/20260606020000-add-workflow-state-node-positions";
import { AddWorkflowTransitionHandles20260606030000 } from "./migrations/20260606030000-add-workflow-transition-handles";
import { CreateWorkflowActions20260606040000 } from "./migrations/20260606040000-create-workflow-actions";
import { RemoveSaleOrderDeliveryType20260606050000 } from "./migrations/20260606050000-remove-sale-order-delivery-type";
import { AddGlobalWorkflowTransitions20260606060000 } from "./migrations/20260606060000-add-global-workflow-transitions";
import { AddSaleOrderInvoiceSend20260606070000 } from "./migrations/20260606070000-add-sale-order-invoice-send";
import { AddWorkflowTransitionPurpose20260606080000 } from "./migrations/20260606080000-add-workflow-transition-purpose";
import { CreateSaleOrderStates20260608000000 } from "./migrations/20260608000000-create-sale-order-states";
import { AddSaleOrderStatisticsIndexes20260609000000 } from "./migrations/20260609000000-add-sale-order-statistics-indexes";

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
  synchronize: true,
  migrationsRun: envs.nodeEnv === "production",
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
    CreateLogisticsCatalogs20260523000000,
    CreateAgenciesCore20260524000000,
    CreateSaleOrdersCore20260525000000,
    AddUserRoleManagementAudit20260526000000,
    AddMasterSuperAdministratorRole20260527000000,
    SaleOrdersAgencyDetail20260527000000,
    AllowSuperAdminWithoutRole20260528000000,
    CreateUserGrantablePermissions20260528010000,
    CreateUserManageableRoles20260528020000,
    SaleOrdersWarehouseNullable20260530000000,
    CreateAgencySubsidiaries20260603000000,
    CreateWorkflowEngine20260606010000,
    AddWorkflowStateNodePositions20260606020000,
    AddWorkflowTransitionHandles20260606030000,
    CreateWorkflowActions20260606040000,
    RemoveSaleOrderDeliveryType20260606050000,
    AddGlobalWorkflowTransitions20260606060000,
    AddSaleOrderInvoiceSend20260606070000,
    AddWorkflowTransitionPurpose20260606080000,
    CreateSaleOrderStates20260608000000,
    AddSaleOrderStatisticsIndexes20260609000000,
  ],
});

export const migrationDataSource = new DataSource(getMigrationDataSourceOptions());
