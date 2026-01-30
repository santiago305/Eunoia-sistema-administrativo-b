import { InvalidUserIdError } from "../errors/invalid-user.error";

export class UserId {
    public readonly value: string;

    constructor(value: string) {
        const normalized = value?.trim();
        if (!normalized) {
            throw new InvalidUserIdError();
        }
        this.value = normalized;
    }
}
