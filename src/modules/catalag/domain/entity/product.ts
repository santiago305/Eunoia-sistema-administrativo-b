
export class Product{
    constructor(
        private readonly id: string,
        private readonly name: string,
        private readonly description?: string,
        private readonly isActive: boolean = true,
        private readonly createdAt?: Date,
        private readonly updatedAt?: Date
    ){}
}