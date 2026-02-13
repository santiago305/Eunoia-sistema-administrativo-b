export class InvalidVariantAttributesError extends Error {
  constructor(message = "Invalid VariantAttributes") {
    super(message);
    this.name = "InvalidVariantAttributesError";
  }
}

export type AttributesRecord = Record<string, unknown>;

export class VariantAttributes {
  private readonly value: AttributesRecord;

  private constructor(value: AttributesRecord) {
    this.value = Object.freeze({ ...value });
  }

  static create(raw: unknown): VariantAttributes {
    if (raw === null || raw === undefined) {
      return new VariantAttributes({});
    }

    if (typeof raw !== "object" || Array.isArray(raw)) {
      throw new InvalidVariantAttributesError("Attributes must be an object");
    }

    const record = raw as Record<string, unknown>;
    const cleaned: AttributesRecord = {};

    for (const [k, v] of Object.entries(record)) {
      const key = (k ?? "").trim();
      if (!key) continue;
      if (v === undefined) continue; // JSON no guarda undefined
      cleaned[key] = v;
    }

    // Validación simple de serialización JSON (para que no metas cosas raras)
    try {
      JSON.stringify(cleaned);
    } catch {
      throw new InvalidVariantAttributesError("Attributes must be JSON-serializable");
    }

    return new VariantAttributes(cleaned);
  }

  getAll(): AttributesRecord {
    return this.value;
  }

  get(key: string): unknown {
    return this.value[key];
  }

  equals(other: VariantAttributes): boolean {
    return JSON.stringify(this.value) === JSON.stringify(other.value);
  }

  toJSON(): AttributesRecord {
    return this.value;
  }
}