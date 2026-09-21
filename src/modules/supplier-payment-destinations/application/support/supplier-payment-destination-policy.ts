import { BadRequestException } from "@nestjs/common";
import { PaymentMethodCode } from "src/modules/payment-methods/domain/value-objects/payment-method-catalog";
import { SupplierPaymentDestinationType } from "../../domain/entity/supplier-payment-destination";

export const assertDestinationCompatible = (code: PaymentMethodCode, type: SupplierPaymentDestinationType) => {
  const valid = code === "DIGITAL_WALLET" ? type === "DIGITAL_WALLET" :
    code === "CARD" ? type === "CARD" :
    code === "CASH" ? type === "CASH" :
    code === "BANK_TRANSFER" || code === "BANK_DEPOSIT" || code === "CHECK" ? type === "BANK_ACCOUNT" : true;
  if (!valid) throw new BadRequestException("El destino no es compatible con el método de pago");
};
