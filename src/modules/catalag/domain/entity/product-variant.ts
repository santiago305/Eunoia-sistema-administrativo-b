import { Money } from '../value-object/money.vo';
import {ProductId} from '../value-object/product.vo'

export class ProductVar {
    constructor(
        private readonly id: string,
        private readonly product_id: ProductId,
        private readonly sku: string,
        private readonly barcode: string,
        private readonly attributes: string,
        private readonly price: Money,
        private readonly cost: Money,
        private readonly isActive: boolean = true,
        private readonly createdAt?: Date,
    ){}
}