import { randomUUID } from "crypto";
import { InvalidPackItemError } from "../errors/invalid-pack-item.error";
import { PackId } from "../value-objects/pack-id.vo";
import { PackItemId } from "../value-objects/pack-item-id.vo";

export class PackItem {
  private constructor(
    public readonly packItemId: PackItemId,
    public readonly packId: PackId,
    public readonly skuId: string,
    public readonly quantity: number,
    public readonly price: number,
  ) {}

  static create(params: {
    packItemId?: PackItemId;
    packId: PackId;
    skuId: string;
    quantity: number;
    price: number;
  }) {
    const skuId = params.skuId?.trim();
    if (!skuId) {
      throw new InvalidPackItemError("Sku invalido");
    }
    if (!(params.quantity > 0)) {
      throw new InvalidPackItemError("Cantidad invalida");
    }
    if (params.price < 0) {
      throw new InvalidPackItemError("Precio invalido");
    }

    return new PackItem(
      params.packItemId ?? new PackItemId(randomUUID()),
      params.packId,
      skuId,
      params.quantity,
      params.price,
    );
  }
}

