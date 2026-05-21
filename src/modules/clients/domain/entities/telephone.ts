import { randomUUID } from "crypto";
import { InvalidTelephoneError } from "../errors/invalid-telephone.error";
import { ClientId } from "../value-objects/client-id.vo";
import { TelephoneId } from "../value-objects/telephone-id.vo";

export class Telephone {
  private constructor(
    public readonly telephoneId: TelephoneId,
    public readonly clientId: ClientId,
    public readonly number: string,
    public readonly isMain: boolean,
  ) {}

  static create(params: {
    telephoneId?: TelephoneId;
    clientId: ClientId;
    number: string;
    isMain?: boolean;
  }) {
    const number = params.number?.trim();
    if (!number) {
      throw new InvalidTelephoneError();
    }

    const isMain = params.isMain ?? false;

    return new Telephone(
      params.telephoneId ?? new TelephoneId(randomUUID()),
      params.clientId,
      number,
      isMain,
    );
  }
}
