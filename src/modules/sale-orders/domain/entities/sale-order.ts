
export type SaleOrderItem = {
  id: string;
  saleOrderId: string;
  referencePackId: string | null;
  description: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  createdAt: Date;
};

export class SaleOrder {
  constructor(
    public readonly id: string,
    public readonly serie: string | null,
    public readonly correlative: number | null,
    public readonly warehouseId: string | null,
    public readonly clientId: string,
    public readonly agencySubsidiaryId: string | null,
    public readonly sourceId: string | null,
    public readonly scheduleDate: string | null,
    public readonly deliveryDate: string | null,
    public readonly subTotal: number,
    public readonly deliveryCost: number,
    public readonly discount: number,
    public readonly total: number,
    public readonly note: string | null,
    public readonly advertisingCode: string | null,
    public readonly observation: string | null,
    public readonly sendDate: Date | null,
    public readonly sendPhoto: string | null,
    public readonly sendCode: string | null,
    public readonly sendAddress: string | null,
    public readonly assignedBy: string | null,
    public readonly createdBy: string,
    public readonly workflowId: string | null,
    public readonly currentStateId: string | null,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date | null,
    public readonly items: SaleOrderItem[] = [],
    public readonly invoiceSend: boolean = false,
  ) {}
}
