export class ProductEquivalence {
    constructor(
        public readonly equivalenceId: string,
        public readonly primaVariantId: string,
        public readonly fromUnitId: string,
        public readonly toUnitId: string,
        public readonly factor: number
    ){}
}
