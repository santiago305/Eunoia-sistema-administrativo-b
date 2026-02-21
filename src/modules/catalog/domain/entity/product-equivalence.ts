export class ProductEquivalence {
    constructor(
        public readonly equivalenceId: string,
        public readonly productId: string,
        public readonly fromUnitId: string,
        public readonly toUnitId: string,
        public readonly factor: number
    ){}
}
