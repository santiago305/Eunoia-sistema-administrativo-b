import { DocType } from "../value-objects/doc-type";
import { InvalidDocumentSerieError } from "../errors/invalid-document-serie.error";

export default class DocumentSerie {
    private constructor(
        public readonly id: string,
        public readonly code: string,
        public readonly name: string,
        public readonly docType: DocType,
        public readonly warehouseId: string,
        public readonly nextNumber: number,
        public readonly padding: number,
        public readonly separator: string,
        public readonly isActive: boolean,
        public readonly createdAt?: Date,
    ) {}

    static create(params: {
        id?: string;
        code: string;
        name: string;
        docType: DocType;
        warehouseId: string;
        nextNumber?: number;
        padding?: number;
        separator?: string;
        isActive?: boolean;
        createdAt?: Date;
    }) {
        const code = params.code?.trim();
        const name = params.name?.trim();
        const warehouseId = params.warehouseId?.trim();
        const separator = params.separator?.trim() || "-";

        if (!code) throw new InvalidDocumentSerieError("El codigo de serie es obligatorio");
        if (!name) throw new InvalidDocumentSerieError("El nombre de serie es obligatorio");
        if (!params.docType) throw new InvalidDocumentSerieError("El tipo de documento es obligatorio");
        if (!warehouseId) throw new InvalidDocumentSerieError("El almacen es obligatorio");
        if ((params.nextNumber ?? 1) <= 0) throw new InvalidDocumentSerieError("El siguiente numero es invalido");
        if ((params.padding ?? 6) <= 0) throw new InvalidDocumentSerieError("El padding es invalido");

        return new DocumentSerie(
            params.id,
            code,
            name,
            params.docType,
            warehouseId,
            params.nextNumber ?? 1,
            params.padding ?? 6,
            separator,
            params.isActive ?? true,
            params.createdAt ?? new Date(),
        );
    }
}
