/* eslint-disable no-console */
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000/api";
const USER1_EMAIL = process.env.USER1_EMAIL ?? "minecratf633@gmail.com";
const USER1_PASSWORD = process.env.USER1_PASSWORD ?? "123123123";
const USER2_EMAIL = process.env.USER2_EMAIL ?? USER1_EMAIL;
const USER2_PASSWORD = process.env.USER2_PASSWORD ?? USER1_PASSWORD;
const PRODUCT_TYPE = process.env.PRODUCT_TYPE ?? "PRODUCT"; // PRODUCT | MATERIAL

if (!USER1_EMAIL || !USER1_PASSWORD) {
  console.error("Faltan credenciales. Define USER1_EMAIL y USER1_PASSWORD.");
  process.exit(1);
}

class HttpSession {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.cookies = new Map();
  }

  cookieHeader() {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  csrfToken() {
    return this.cookies.get("csrf_token") ?? "";
  }

  storeSetCookies(res) {
    const getSetCookie = res.headers.getSetCookie?.bind(res.headers);
    const raw = getSetCookie ? getSetCookie() : [];
    for (const c of raw) {
      const [pair] = c.split(";");
      const eq = pair.indexOf("=");
      if (eq > 0) {
        const k = pair.slice(0, eq).trim();
        const v = pair.slice(eq + 1).trim();
        this.cookies.set(k, v);
      }
    }
  }

  async request(method, path, body) {
    const headers = { "Content-Type": "application/json" };
    const cookie = this.cookieHeader();
    if (cookie) headers.Cookie = cookie;
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const csrf = this.csrfToken();
      if (csrf) headers["x-csrf-token"] = csrf;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    this.storeSetCookies(res);

    let data = null;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    return { ok: res.ok, status: res.status, data };
  }

  get(path) { return this.request("GET", path); }
  post(path, body) { return this.request("POST", path, body); }
}

function pickDocumentId(responseData) {
  if (!responseData) return "";
  if (responseData.documentId) return responseData.documentId;
  if (responseData.data?.documentId) return responseData.data.documentId;
  return "";
}

function asArray(x) {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

async function login(session, email, password) {
  const res = await session.post("/auth/login", { email, password });
  if (!res.ok) throw new Error(`Login falló (${res.status}): ${JSON.stringify(res.data)}`);
}

async function main() {
  const s1 = new HttpSession(BASE_URL);
  const s2 = new HttpSession(BASE_URL);

  console.log("1) Login usuarios...");
  await login(s1, USER1_EMAIL, USER1_PASSWORD);
  await login(s2, USER2_EMAIL, USER2_PASSWORD);

  console.log("2) Obtener almacenes...");
  const whRes = await s1.get("/warehouses");
  if (!whRes.ok) throw new Error(`No pude listar warehouses: ${JSON.stringify(whRes.data)}`);
  const warehouses = asArray(whRes.data?.items ?? whRes.data).map((w) => ({
    id: w.warehouseId ?? w.id,
    name: w.name ?? "-",
  })).filter((w) => w.id);

  if (warehouses.length < 2) throw new Error("Se requieren al menos 2 almacenes.");
  const fromWarehouseId = warehouses[0].id;
  const toWarehouseId = warehouses[1].id;

  console.log(`   Origen: ${warehouses[0].name} (${fromWarehouseId})`);
  console.log(`   Destino: ${warehouses[1].name} (${toWarehouseId})`);

  console.log("3) Obtener serie TRANSFER activa...");
  const serieRes = await s1.get(`/series/active?warehouseId=${fromWarehouseId}&docType=TRANSFER&isActive=true`);
  if (!serieRes.ok) throw new Error(`No pude obtener series: ${JSON.stringify(serieRes.data)}`);
  const series = asArray(serieRes.data);
  if (!series.length) throw new Error("No hay serie TRANSFER activa para el almacén origen.");
  const serieId = series[0].id;

  console.log("4) Buscar SKU con stock disponible...");
  const skuRes = await s1.get(`/skus?page=1&limit=50&productType=${PRODUCT_TYPE}&isActive=true`);
  if (!skuRes.ok) throw new Error(`No pude listar SKUs: ${JSON.stringify(skuRes.data)}`);
  const skuItems = asArray(skuRes.data?.items ?? skuRes.data);

  let selectedSkuId = "";
  let initialAvailable = 0;

  for (const item of skuItems) {
    const skuId = item?.sku?.id ?? item?.id;
    if (!skuId) continue;
    const stockRes = await s1.get(`/skus/get-stock?warehouseId=${fromWarehouseId}&skuId=${skuId}`);
    if (!stockRes.ok) continue;
    const available = Number(stockRes.data?.available ?? 0);
    if (available >= 2) {
      selectedSkuId = skuId;
      initialAvailable = available;
      break;
    }
  }

  if (!selectedSkuId) throw new Error("No encontré SKU con available >= 2 en el almacén origen.");

  const qty = Math.max(1, Math.floor(initialAvailable * 0.6)); // fuerza conflicto: 2*qty > available en la mayoría de casos
  console.log(`   SKU: ${selectedSkuId}`);
  console.log(`   Stock disponible inicial: ${initialAvailable}`);
  console.log(`   Cantidad por transferencia: ${qty}`);

  const payload = {
    fromWarehouseId,
    toWarehouseId,
    serieId,
    note: "E2E concurrency test",
    items: [{ skuId: selectedSkuId, quantity: qty, unitCost: 0 }],
  };

  console.log("5) Crear 2 transferencias DRAFT...");
  const create1 = await s1.post("/stock-items/movements/transfer", payload);
  const create2 = await s2.post("/stock-items/movements/transfer", payload);

  if (!create1.ok || !create2.ok) {
    throw new Error(
      `Fallo creando drafts:\n#1 ${create1.status} ${JSON.stringify(create1.data)}\n#2 ${create2.status} ${JSON.stringify(create2.data)}`
    );
  }

  const doc1 = pickDocumentId(create1.data);
  const doc2 = pickDocumentId(create2.data);
  if (!doc1 || !doc2) throw new Error("No pude extraer documentId de las transferencias creadas.");

  console.log(`   Draft 1: ${doc1}`);
  console.log(`   Draft 2: ${doc2}`);

  console.log("6) Procesar concurrentemente ambos documentos...");
  const [p1, p2] = await Promise.allSettled([
    s1.post(`/inventory-documents/${doc1}/process`, {}),
    s2.post(`/inventory-documents/${doc2}/process`, {}),
  ]);

  const r1 = p1.status === "fulfilled" ? p1.value : { ok: false, status: 0, data: String(p1.reason) };
  const r2 = p2.status === "fulfilled" ? p2.value : { ok: false, status: 0, data: String(p2.reason) };

  console.log("   Resultado doc1:", r1.status, JSON.stringify(r1.data));
  console.log("   Resultado doc2:", r2.status, JSON.stringify(r2.data));

  const successCount = [r1, r2].filter((r) => r.ok).length;

  console.log("7) Verificar invariantes...");
  const finalStockRes = await s1.get(`/skus/get-stock?warehouseId=${fromWarehouseId}&skuId=${selectedSkuId}`);
  if (!finalStockRes.ok) throw new Error(`No pude leer stock final: ${JSON.stringify(finalStockRes.data)}`);
  const finalAvailable = Number(finalStockRes.data?.available ?? 0);

  const expectedFinal = initialAvailable - successCount * qty;
  const nonNegative = finalAvailable >= 0;
  const matchesExpected = finalAvailable === expectedFinal;

  console.log(`   Success count: ${successCount}`);
  console.log(`   Stock final disponible: ${finalAvailable}`);
  console.log(`   Esperado: ${expectedFinal}`);

  if (!nonNegative) throw new Error("FAIL: Stock final negativo.");
  if (!matchesExpected) throw new Error("FAIL: Stock final no coincide con operaciones exitosas.");

  console.log("OK: Concurrencia consistente (sin sobreventa/stock negativo).");
}

main().catch((err) => {
  console.error("E2E FAILED:", err.message);
  process.exit(1);
});
