import { ProductionStatusType } from "../value-objects/production-status.vo";
import { DomainError } from "./domain.error";

export class InvalidStatusError extends DomainError {
  readonly current:ProductionStatusType;
  readonly allowed:ProductionStatusType[];
  readonly action:string;

  constructor(params: { action: string; current: ProductionStatusType; allowed: ProductionStatusType[] }) {
    super(
      `Estado invalido para esta acción ${params.action}. 
      Estado actual: ${params.current}. Estados permitidos: ${params.allowed.join(", ")}`
    );
    this.name = "InvalidStatusError";
    this.current = params.current;
    this.allowed = params.allowed;
    this.action = params.action;
  }
}