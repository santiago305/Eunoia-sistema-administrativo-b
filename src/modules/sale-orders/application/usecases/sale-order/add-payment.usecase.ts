import { ConflictException, Injectable } from '@nestjs/common';

/** @deprecated Create sale incomes through the unified order-payment editor. */
@Injectable()
export class AddSaleOrderPaymentUsecase {
  async execute(_input: Record<string, unknown>): Promise<never> {
    void _input;
    throw new ConflictException({
      code: 'FINANCIAL_ENDPOINT_RETIRED',
      message: 'Esta ruta de pagos fue retirada. Usa el flujo unificado de pagos del pedido para conservar estados, evidencia e historial financiero.',
    });
  }
}
