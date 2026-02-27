import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from "class-validator";
import { SupplierDocType } from "src/modules/suppliers/domain/object-values/supplier-doc-type";

export function IsValidDocumentNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "IsValidDocumentNumber",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (typeof value !== "string") return false;

          const docType = (args.object as any).documentType as SupplierDocType;
          if (!docType) return false;

          if (docType === SupplierDocType.DNI) {
            return /^\d{8}$/.test(value);
          }
          if (docType === SupplierDocType.RUC) {
            return /^\d{11}$/.test(value);
          }
          if (docType === SupplierDocType.CE) {
            return value.trim().length >= 1;
          }
          return false;
        },

        defaultMessage(args: ValidationArguments) {
          const docType = (args.object as any).documentType;
          if (docType === SupplierDocType.DNI) return "DNI debe tener 8 dígitos";
          if (docType === SupplierDocType.RUC) return "RUC debe tener 11 dígitos";
          if (docType === SupplierDocType.CE) return "CE no puede estar vacío";
          return "Tipo de documento inválido";
        },
      },
    });
  };
}
