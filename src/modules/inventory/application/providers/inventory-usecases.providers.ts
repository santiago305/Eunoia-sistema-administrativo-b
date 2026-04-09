import { Provider } from "@nestjs/common";
import { CreateDocumentSerieUseCase } from "../use-cases/document-serie/create-document-serie.usecase";
import { GetDocumentSerieUseCase } from "../use-cases/document-serie/get-document-serie.usecase";
import { GetActiveDocumentSerieUseCase } from "../use-cases/document-serie/get-document-series.usecase";
import { SetDocumentSerieActive } from "../use-cases/document-serie/set-active.usecase";
import { CreateDocumentUseCase } from "../use-cases/document-inventory/create-document.usecase";
import { ListDocumentsUseCase } from "../use-cases/document-inventory/list-documents.usecase";
import { GetDocumentUseCase } from "../use-cases/document-inventory/get-document.usecase";
import { CancelDocumentUseCase } from "../use-cases/document-inventory/cancel-document.usecase";
import { PostDocumentoOut } from "../use-cases/document-inventory/post-document-out.usecase";
import { PostDocumentoIn } from "../use-cases/document-inventory/post-document-in.usecase";
import { PostDocumentoTransfer } from "../use-cases/document-inventory/post-document-transfer.usecase";
import { PostDocumentoAdjustment } from "../use-cases/document-inventory/post-document-adjustment.usecase";
import { CreateAddItemPostOutUseCase } from "../use-cases/document-inventory/create-add-item-post-out.usecase";
import { CreateAddItemPostAdjustmentUseCase } from "../use-cases/document-inventory/create-add-item-post-adjustment.usecase";
import { CreateAddItemPostTransferUseCase } from "../use-cases/document-inventory/create-add-item-post-transfer.usecase";
import { AddItemUseCase } from "../use-cases/document-item-inventory/add-item.usecase";
import { ListDocumentItemsUseCase } from "../use-cases/document-item-inventory/list-items.usecase";
import { UpdateItemUseCase } from "../use-cases/document-item-inventory/update-item.usecase";
import { RemoveItemUseCase } from "../use-cases/document-item-inventory/remove-item.usecase";
import { GetAvailabilityUseCase } from "../use-cases/inventory/get-availability.usecase";
import { GetStockUseCase } from "../use-cases/inventory/get-stock.usecase";
import { ListInventoryUseCase } from "../use-cases/inventory/list-inventory.usecase";
import { GetLedgerUseCase } from "../use-cases/ledger/get-ledger.usecase";
import { GetLedgerDailyTotalsUseCase } from "../use-cases/ledger/get-ledger-daily-totals.usecase";
import { GetSalesMonthlyTotalsUseCase } from "../use-cases/analytics/get-sales-monthly-totals.usecase";
import { GetSalesWeekdayTotalsUseCase } from "../use-cases/analytics/get-sales-weekday-totals.usecase";
import { GetSalesWarehouseTotalsUseCase } from "../use-cases/analytics/get-sales-warehouse-totals.usecase";
import { GetDemandSummaryUseCase } from "../use-cases/analytics/get-demand-summary.usecase";
import { GetSalesDailyTotalsUseCase } from "../use-cases/analytics/get-sales-daily-totals.usecase";
import { GetMonthlyProjectionUseCase } from "../use-cases/analytics/get-monthly-projection.usecase";
import { CreateStockItemForProduct } from "../use-cases/stock-item/create-for-product.usecase";
import { CreateStockItemForVariant } from "../use-cases/stock-item/create-for-variant.usecase";

export const inventoryUsecasesProviders: Provider[] = [
  CreateDocumentSerieUseCase,
  GetDocumentSerieUseCase,
  GetActiveDocumentSerieUseCase,
  SetDocumentSerieActive,
  CreateDocumentUseCase,
  AddItemUseCase,
  ListDocumentsUseCase,
  GetDocumentUseCase,
  ListDocumentItemsUseCase,
  UpdateItemUseCase,
  RemoveItemUseCase,
  CancelDocumentUseCase,
  PostDocumentoOut,
  PostDocumentoIn,
  PostDocumentoTransfer,
  PostDocumentoAdjustment,
  CreateAddItemPostOutUseCase,
  CreateAddItemPostAdjustmentUseCase,
  CreateAddItemPostTransferUseCase,
  GetAvailabilityUseCase,
  GetStockUseCase,
  ListInventoryUseCase,
  GetLedgerUseCase,
  GetLedgerDailyTotalsUseCase,
  GetSalesMonthlyTotalsUseCase,
  GetSalesWeekdayTotalsUseCase,
  GetSalesWarehouseTotalsUseCase,
  GetSalesDailyTotalsUseCase,
  GetDemandSummaryUseCase,
  GetMonthlyProjectionUseCase,
  CreateStockItemForProduct,
  CreateStockItemForVariant,
];
