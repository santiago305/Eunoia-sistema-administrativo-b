import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";

const MIN_REASON_LENGTH = 5;
const MAX_REASON_LENGTH = 500;

/** @deprecated Financial state changes must use the ledger-backed income endpoints. */
@Injectable()
export class VoidSaleOrderPaymentUsecase {
  async execute(input: { saleOrderId: string; paymentId: string; executedBy: string; reason: string }) {
    const reason = input.reason?.trim() ?? "";
    if (reason.length < MIN_REASON_LENGTH) {
      throw new BadRequestException({ code: "INCOME_VOID_REASON_REQUIRED", message: "Ingresa un motivo de al menos 5 caracteres." });
    }
    if (reason.length > MAX_REASON_LENGTH) {
      throw new BadRequestException({ code: "INCOME_VOID_REASON_TOO_LONG", message: "El motivo no puede superar los 500 caracteres." });
    }
    if (!input.executedBy) throw new BadRequestException("No se pudo identificar al usuario autenticado");
    throw new ConflictException({
      code: "FINANCIAL_ENDPOINT_RETIRED",
      message: "Esta ruta fue retirada para proteger la contabilidad. Usa la acción Cancelar o Revertir de Finanzas > Ingresos.",
    });
  }
}
