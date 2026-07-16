import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { DataSource, DataSourceOptions } from "typeorm";
import { envs } from "../config/envs";
import { CreateFoundationSchema20260410000000 } from "./migrations/20260410000000-create-foundation-schema";
import { EnableUnaccentExtension20260411000000 } from "./migrations/20260411000000-enable-unaccent-extension";
import { AddListingIndexes20260412000000 } from "./migrations/20260412000000-add-listing-indexes";
import { ExpandPaymentMethodRelations20260414000000 } from "./migrations/20260414000000-expand-payment-method-relations";
import { AddPartialProductionStatus20260418000000 } from "./migrations/20260418000000-add-partial-production-status";
import { CreateListingSearchTables20260421000000 } from "./migrations/20260421000000-create-listing-search-tables";
import { CreateUbigeoTables20260421010000 } from "./migrations/20260421010000-create-ubigeo-tables";
import { AddSkuImageColumn20260502000000 } from "./migrations/20260502000000-add-sku-image-column";
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
import { CreateBankAccounts20260527010000 } from "./migrations/20260527010000-create-bank-accounts";
import { SalePaymentsBankAccount20260527020000 } from "./migrations/20260527020000-sale-payments-bank-account";
import { AllowSuperAdminWithoutRole20260528000000 } from "./migrations/20260528000000-allow-super-admin-without-role";
import { CreateUserGrantablePermissions20260528010000 } from "./migrations/20260528010000-create-user-grantable-permissions";
import { CreateUserManageableRoles20260528020000 } from "./migrations/20260528020000-create-user-manageable-roles";
import { RemoveProfileSessionsPagePermissions20260529000000 } from "./migrations/20260529000000-remove-profile-sessions-page-permissions";
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
import { AddWorkflowAutomaticBranches20260612000000 } from "./migrations/20260612000000-add-workflow-automatic-branches";
import { CreateProductCatalogCore20260618000000 } from "./migrations/20260618000000-create-product-catalog-core";
import { CreateSecurityAuditCore20260618100000 } from "./migrations/20260618100000-create-security-audit-core";
import { CreateInventoryAlertSettings20260619000000 } from "./migrations/20260619000000-create-inventory-alert-settings";
import { RemoveOutOrdersPagePermission20260620000000 } from "./migrations/20260620000000-remove-out-orders-page-permission";
import { CreateProductionHistoryEvents20260621000000 } from "./migrations/20260621000000-create-production-history-events";
import { MapProductionLegacyPermissions20260621010000 } from "./migrations/20260621010000-map-production-legacy-permissions";
import { CreateAccountsPayable20260621020000 } from "./migrations/20260621020000-create-accounts-payable";
import { AddPurchaseTypesAndStatuses20260621190000 } from "./migrations/20260621190000-add-purchase-types-and-statuses";
import { CreatePurchaseReceptions20260621210000 } from "./migrations/20260621210000-create-purchase-receptions";
import { CreatePurchaseAttachments20260622110000 } from "./migrations/20260622110000-create-purchase-attachments";
import { CreateCompanyPaymentAccountsAndScheduledPayments20260622130000 } from "./migrations/20260622130000-create-company-payment-accounts-and-scheduled-payments";
import { CreateRecurringPurchases20260626090000 } from "./migrations/20260626090000-create-recurring-purchases";
import { AddPurchaseModulePermissions20260626110000 } from "./migrations/20260626110000-add-purchase-module-permissions";
import { MigrateLegacyPurchaseImagesToAttachments20260627120000 } from "./migrations/20260627120000-migrate-legacy-purchase-images-to-attachments";
import { AddDefaultPaymentAccounts20260627170000 } from "./migrations/20260627170000-add-default-payment-accounts";
import { UnifySalePaymentsCompanyPaymentAccounts20260628000000 } from "./migrations/20260628000000-unify-sale-payments-company-payment-accounts";
import { AddFiscalDocumentTypeToPurchaseAttachments20260628010000 } from "./migrations/20260628010000-add-fiscal-document-type-to-purchase-attachments";
import { AddPaymentMethodRequiresVoucher20260628120000 } from "./migrations/20260628120000-add-payment-method-requires-voucher";
import { AddSaleOrderAdvertisingObservation20260701000000 } from "./migrations/20260701000000-add-sale-order-advertising-observation";
import { AddSaleOrderAdvisersAndPhotos20260703000000 } from "./migrations/20260703000000-add-sale-order-advisers-and-photos";
import { ReplaceSaleOrderAgencyDetail20260703010000 } from "./migrations/20260703010000-replace-sale-order-agency-detail";
import { CreateSaleOrderAttachmentsAndDiscount20260704000000 } from "./migrations/20260704000000-create-sale-order-attachments-and-discount";
import { AddPurchaseDashboardGroupPermissions20260707010000 } from "./migrations/20260707010000-add-purchase-dashboard-group-permissions";
import { RestoreSaleOrderAgencyDetail20260708000000 } from "./migrations/20260708000000-restore-sale-order-agency-detail";
import { AddSaleOrderReserveBool20260708010000 } from "./migrations/20260708010000-add-sale-order-reserve-bool";
import { AddPurchaseDashboardIndexes20260709010000 } from "./migrations/20260709010000-add-purchase-dashboard-indexes";
import { AddSaleOrdersExportPermission20260709170000 } from "./migrations/20260709170000-add-sale-orders-export-permission";
import { AddRecurringPurchaseBillingAnchorDay20260710154000 } from "./migrations/20260710154000-add-recurring-purchase-billing-anchor-day";
import { AddRecurringPurchaseReminderDeliveries20260710165000 } from "./migrations/20260710165000-add-recurring-purchase-reminder-deliveries";
import { AddRecurringPurchaseDueNotificationPermission20260710172000 } from "./migrations/20260710172000-add-recurring-purchase-due-notification-permission";
import { AddRecurringPurchasePaymentPermissions20260711100000 } from "./migrations/20260711100000-add-recurring-purchase-payment-permissions";
import { AddRecurringPurchaseRelations20260711120000 } from "./migrations/20260711120000-add-recurring-purchase-relations";
import { AddRecurringPurchaseExportPermission20260712120000 } from "./migrations/20260712120000-add-recurring-purchase-export-permission";
import { AddAgencyDescription20260713000000 } from "./migrations/20260713000000-add-agency-description";
import { CreateLogisticsPayables20260714010000 } from "./migrations/20260714010000-create-logistics-payables";
import { NormalizeFileStorageKeys20260714020000 } from "./migrations/20260714020000-normalize-file-storage-keys";
import { CreateProductionAttachments20260715090000 } from "./migrations/20260715090000-create-production-attachments";

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
  migrationsRun: envs.nodeEnv === "production",
  autoLoadEntities: true,
});

export const getMigrationDataSourceOptions = (): DataSourceOptions => ({
  ...getBaseTypeOrmOptions(),
  entities: [],
  migrationsTableName: "typeorm_migrations",
  migrations: [
    CreateFoundationSchema20260410000000,
    EnableUnaccentExtension20260411000000,
    AddListingIndexes20260412000000,
    ExpandPaymentMethodRelations20260414000000,
    AddPartialProductionStatus20260418000000,
    CreateListingSearchTables20260421000000,
    CreateUbigeoTables20260421010000,
    AddSkuImageColumn20260502000000,
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
    CreateBankAccounts20260527010000,
    SalePaymentsBankAccount20260527020000,
    AllowSuperAdminWithoutRole20260528000000,
    CreateUserGrantablePermissions20260528010000,
    CreateUserManageableRoles20260528020000,
    RemoveProfileSessionsPagePermissions20260529000000,
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
    AddWorkflowAutomaticBranches20260612000000,
    CreateProductCatalogCore20260618000000,
    CreateSecurityAuditCore20260618100000,
    CreateInventoryAlertSettings20260619000000,
    RemoveOutOrdersPagePermission20260620000000,
    CreateProductionHistoryEvents20260621000000,
    MapProductionLegacyPermissions20260621010000,
    CreateAccountsPayable20260621020000,
    AddPurchaseTypesAndStatuses20260621190000,
    CreatePurchaseReceptions20260621210000,
    CreatePurchaseAttachments20260622110000,
    CreateCompanyPaymentAccountsAndScheduledPayments20260622130000,
    CreateRecurringPurchases20260626090000,
    AddPurchaseModulePermissions20260626110000,
    MigrateLegacyPurchaseImagesToAttachments20260627120000,
    AddDefaultPaymentAccounts20260627170000,
    UnifySalePaymentsCompanyPaymentAccounts20260628000000,
    AddFiscalDocumentTypeToPurchaseAttachments20260628010000,
    AddPaymentMethodRequiresVoucher20260628120000,
    AddSaleOrderAdvertisingObservation20260701000000,
    AddSaleOrderAdvisersAndPhotos20260703000000,
    ReplaceSaleOrderAgencyDetail20260703010000,
    CreateSaleOrderAttachmentsAndDiscount20260704000000,
    AddPurchaseDashboardGroupPermissions20260707010000,
    RestoreSaleOrderAgencyDetail20260708000000,
    AddSaleOrderReserveBool20260708010000,
    AddPurchaseDashboardIndexes20260709010000,
    AddSaleOrdersExportPermission20260709170000,
    AddRecurringPurchaseBillingAnchorDay20260710154000,
    AddRecurringPurchaseReminderDeliveries20260710165000,
    AddRecurringPurchaseDueNotificationPermission20260710172000,
    AddRecurringPurchasePaymentPermissions20260711100000,
    AddRecurringPurchaseRelations20260711120000,
    AddRecurringPurchaseExportPermission20260712120000,
    AddAgencyDescription20260713000000,
    CreateLogisticsPayables20260714010000,
    NormalizeFileStorageKeys20260714020000,
    CreateProductionAttachments20260715090000,
  ],
});

export const migrationDataSource = new DataSource(getMigrationDataSourceOptions());
