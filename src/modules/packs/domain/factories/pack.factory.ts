import { Pack } from "../entities/pack";
import { PackItem } from "../entities/pack-item";
import { PackId } from "../value-objects/pack-id.vo";
import { PackItemId } from "../value-objects/pack-item-id.vo";

export class PackFactory {
  static createPack(params: {
    packId?: PackId;
    description: string;
    total: number;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    return Pack.create(params);
  }

  static createPackItem(params: {
    packItemId?: PackItemId;
    packId: PackId;
    skuId: string;
    quantity: number;
    price: number;
  }) {
    return PackItem.create(params);
  }
}

