import "reflect-metadata";
import { Telephone } from "./telephone";
import { ClientId } from "../value-objects/client-id.vo";

describe("Telephone", () => {
  it("normalizes number trim", () => {
    const tel = Telephone.create({
      clientId: new ClientId("client-1"),
      number: " 999999999 ",
      isMain: true,
    });

    expect(tel.isMain).toBe(true);
    expect(tel.number).toBe("999999999");
  });
});
