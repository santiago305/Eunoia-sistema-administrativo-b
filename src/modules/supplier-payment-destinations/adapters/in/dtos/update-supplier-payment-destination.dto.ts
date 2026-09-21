import { PartialType } from "@nestjs/mapped-types";
import { CreateSupplierPaymentDestinationDto } from "./create-supplier-payment-destination.dto";
export class UpdateSupplierPaymentDestinationDto extends PartialType(CreateSupplierPaymentDestinationDto) {}
