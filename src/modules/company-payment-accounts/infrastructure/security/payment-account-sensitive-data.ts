import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

export type PaymentAccountSensitiveData = {
  accountNumber?: string | null;
  cci?: string | null;
  walletPhone?: string | null;
  holderDocument?: string | null;
};

const getEncryptionKey = () => {
  const secret = process.env.PAYMENT_ACCOUNT_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error("PAYMENT_ACCOUNT_ENCRYPTION_KEY debe tener al menos 32 caracteres");
  }
  return createHash("sha256").update(secret, "utf8").digest();
};

const clean = (value?: string | null) => value?.trim() || null;

export const encryptPaymentAccountSensitiveData = (data: PaymentAccountSensitiveData) => {
  const normalized = {
    accountNumber: clean(data.accountNumber),
    cci: clean(data.cci),
    walletPhone: clean(data.walletPhone),
    ...(clean(data.holderDocument) ? { holderDocument: clean(data.holderDocument) } : {}),
  };
  if (!normalized.accountNumber && !normalized.cci && !normalized.walletPhone) return null;

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(normalized), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return ["v1", iv.toString("base64url"), authTag.toString("base64url"), encrypted.toString("base64url")].join(":");
};

export const decryptPaymentAccountSensitiveData = (
  encrypted?: string | null,
): PaymentAccountSensitiveData => {
  if (!encrypted) return {};
  const [version, ivValue, authTagValue, payload] = encrypted.split(":");
  if (version !== "v1" || !ivValue || !authTagValue || !payload) {
    throw new Error("Formato de identificador financiero cifrado no soportado");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload, "base64url")),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(decrypted) as PaymentAccountSensitiveData;
};

export const hashPaymentAccountIdentifier = (params: {
  type: string;
  institutionName?: string | null;
  walletProvider?: string | null;
  accountNumber?: string | null;
  cci?: string | null;
  walletPhone?: string | null;
  cardLastFour?: string | null;
}) => {
  const normalize = (value?: string | null) => value?.replace(/\s+/g, "").toUpperCase() || "";
  let identifier = "";

  if (params.type === "BANK_ACCOUNT") {
    identifier = normalize(params.accountNumber) || normalize(params.cci);
  } else if (params.type === "DIGITAL_WALLET") {
    identifier = `${normalize(params.walletProvider)}:${normalize(params.walletPhone)}`;
  } else if (params.type === "CREDIT_CARD") {
    identifier = `${normalize(params.institutionName)}:${normalize(params.cardLastFour)}`;
  }

  if (!identifier || identifier === ":") return null;
  return createHash("sha256").update(`${params.type}:${identifier}`, "utf8").digest("hex");
};
