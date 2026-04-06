import { CreditQuota } from "../../domain/entity/credit-quota";
import { CreditQuotaOutput } from "../dtos/credit-quota/output/credit-quota.output";

export class CreditQuotaOutputMapper {
  static toOutput(row: CreditQuota): CreditQuotaOutput {
    return {
      quotaId: row.quotaId,
      number: row.number,
      expirationDate: row.expirationDate,
      paymentDate: row.paymentDate,
      totalToPay: row.totalToPay,
      totalPaid: row.totalPaid,
      createdAt: row.createdAt,
    };
  }
}
