export class InvalidMoneyError extends Error {
  constructor(message = "Invalid Money") {
    super(message);
    this.name = "InvalidMoneyError";
  }
}

export type Currency = "PEN" | "USD";

export class Money {
  private readonly amount: number;
  private readonly currency: Currency;

  private constructor(amount: number, currency: Currency) {
    this.amount = amount;
    this.currency = currency;
    Object.freeze(this);
  }

  static create(amount: number | Money, currency: Currency = "PEN"): Money {
    // Si ya es Money, devuélvelo (útil en mappers)
    if (amount instanceof Money) return amount;

    if (amount === null || amount === undefined) {
      throw new InvalidMoneyError("Money amount is required");
    }

    if (typeof amount !== "number" || !Number.isFinite(amount)) {
      throw new InvalidMoneyError("Money amount must be a finite number");
    }

    if (amount < 0) {
      throw new InvalidMoneyError("Money amount cannot be negative");
    }

    // Normaliza a 2 decimales
    const normalized = Math.round(amount * 100) / 100;

    // ✅ Aquí estaba tu bug: no llames Money.create otra vez
    return new Money(normalized, currency);
  }

  getAmount(): number {
    return this.amount;
  }

  getCurrency(): Currency {
    return this.currency;
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.amount === other.amount;
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.create(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    const result = this.amount - other.amount;
    if (result < 0) {
      throw new InvalidMoneyError("Resulting money cannot be negative");
    }
    return Money.create(result, this.currency);
  }

  private assertSameCurrency(other: Money) {
    if (this.currency !== other.currency) {
      throw new InvalidMoneyError("Cannot operate with different currencies");
    }
  }

  toString(): string {
    return `${this.currency} ${this.amount.toFixed(2)}`;
  }

  toJSON() {
    return { amount: this.amount, currency: this.currency };
  }
}