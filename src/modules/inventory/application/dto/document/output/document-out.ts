import { DocStatus } from "src/modules/inventory/domain/value-objects/doc-status";
import { DocType } from "src/modules/inventory/domain/value-objects/doc-type";

export interface DocumentUserOutput {
  id: string;
  name: string;
  email: string;
  telefono?: string;
  deleted: boolean;
  avatarUrl?: string;
  createdAt?: Date;
  role: { id: string; description: string };
}

export interface DocumentOutput {
  id: string;
  docType: DocType;
  status: DocStatus;
  serie: string;
  correlative: number;
  toWarehouse?: string;
  fromWarehouse?:string;
  createdAt?: Date;
  createdBy?: DocumentUserOutput;
}
