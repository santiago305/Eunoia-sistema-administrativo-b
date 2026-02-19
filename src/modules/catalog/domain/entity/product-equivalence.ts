export class ProductEquivalence {
    constructor(
        public readonly equivalence_id : string,
        public readonly prima_variant_id: string,
        public readonly from_unit_id: string,
        public readonly to_unit_id: string,
        public readonly factor: number
    ){}
}