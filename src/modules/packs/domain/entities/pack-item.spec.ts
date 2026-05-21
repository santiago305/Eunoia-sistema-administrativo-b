import "reflect-metadata";
import { PackItem } from "./pack-item";
import { PackId } from "../value-objects/pack-id.vo";
import { InvalidPackItemError } from "../errors/invalid-pack-item.error";

describe("PackItem", () => {
  it("rejects non-positive quantity", () => {
    expect(() =>
      PackItem.create({
        packId: new PackId("pack-1"),
        skuId: "sku-1",
        quantity: 0,
        price: 10,
      }),
    ).toThrow(InvalidPackItemError);
  });

  it("rejects negative price", () => {
    expect(() =>
      PackItem.create({
        packId: new PackId("pack-1"),
        skuId: "sku-1",
        quantity: 1,
        price: -1,
      }),
    ).toThrow(InvalidPackItemError);
  });
});

