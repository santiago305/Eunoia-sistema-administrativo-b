import { DocType } from "../value-objects/doc-type";

export default class DocumentSerie {
    constructor(
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

}