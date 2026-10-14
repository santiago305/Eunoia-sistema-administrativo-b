export const toMinorUnits = (value: number | string): number => {
  const normalized = String(value).trim();
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(normalized);
  if (!match) throw new Error("El importe debe ser numérico");
  const sign = match[1] === "-" ? -1 : 1;
  const whole = Number(match[2]);
  const decimals = match[3] ?? "";
  const centsPart = Number((decimals + "00").slice(0, 2));
  const shouldRoundUp = Number(decimals[2] ?? "0") >= 5;
  const cents = (whole * 100 + centsPart + (shouldRoundUp ? 1 : 0)) * sign;
  if (!Number.isSafeInteger(cents)) throw new Error("El importe está fuera del rango permitido");
  return cents;
};

export const fromMinorUnits = (cents: number): number => {
  if (!Number.isSafeInteger(cents)) throw new Error("El importe está fuera del rango permitido");
  return cents / 100;
};

export const roundMoney = (value: number | string): number => fromMinorUnits(toMinorUnits(value));

const divideAndRoundHalfUp = (numerator: bigint, denominator: bigint): bigint => {
  if (denominator === 0n) throw new Error("El divisor debe ser distinto de cero");
  const negative = (numerator < 0n) !== (denominator < 0n);
  const absoluteNumerator = numerator < 0n ? -numerator : numerator;
  const absoluteDenominator = denominator < 0n ? -denominator : denominator;
  const rounded = (absoluteNumerator + absoluteDenominator / 2n) / absoluteDenominator;
  return negative ? -rounded : rounded;
};

const fromBigIntMinorUnits = (cents: bigint): number => {
  if (cents > BigInt(Number.MAX_SAFE_INTEGER) || cents < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new Error("El importe está fuera del rango permitido");
  }
  return fromMinorUnits(Number(cents));
};

/** Multiplies a two-decimal amount by a two-decimal quantity and rounds once to cents. */
export const multiplyMoneyByQuantity = (
  amount: number | string,
  quantity: number | string,
): number => {
  const product = BigInt(toMinorUnits(amount)) * BigInt(toMinorUnits(quantity));
  return fromBigIntMinorUnits(divideAndRoundHalfUp(product, 100n));
};

/** Multiplies two two-decimal quantities and rounds once to hundredths. */
export const multiplyQuantities = (
  left: number | string,
  right: number | string,
): number => {
  const product = BigInt(toMinorUnits(left)) * BigInt(toMinorUnits(right));
  return fromBigIntMinorUnits(divideAndRoundHalfUp(product, 100n));
};

/** Divides a two-decimal amount by a two-decimal quantity, returning a two-decimal unit price. */
export const divideMoneyByQuantity = (
  amount: number | string,
  quantity: number | string,
): number => {
  const quantityCents = toMinorUnits(quantity);
  if (quantityCents === 0) return 0;
  const numerator = BigInt(toMinorUnits(amount)) * 100n;
  return fromBigIntMinorUnits(divideAndRoundHalfUp(numerator, BigInt(quantityCents)));
};
