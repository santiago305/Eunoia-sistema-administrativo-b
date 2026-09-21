import { SupplierPaymentDestination } from "../../domain/entity/supplier-payment-destination";
export class SupplierPaymentDestinationOutputMapper {
  static toOutput(destination: SupplierPaymentDestination) {
    return {
      supplierPaymentDestinationId: destination.id,
      supplierId: destination.supplierId,
      methodId: destination.methodId,
      type: destination.type,
      currency: destination.currency,
      name: destination.name,
      maskedLabel: destination.maskedLabel,
      institutionName: destination.institutionName,
      providerName: destination.providerName,
      accountLastFour: destination.accountLastFour,
      cciLastFour: destination.cciLastFour,
      walletIdentifierLastFour: destination.walletIdentifierLastFour,
      holderName: destination.holderName,
      isActive: destination.isActive,
      isDefault: destination.isDefault,
      requiresManualReview: destination.requiresManualReview,
    };
  }
}
