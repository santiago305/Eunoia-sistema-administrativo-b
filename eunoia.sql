-- =========================================================
-- STOCK + CATÁLOGO (PostgreSQL)
-- con USERS/ROLES y auditoría de movimientos
-- =========================================================
-- Esta BD cubre:
-- - Catálogo (productos y variantes/SKU)
-- - Almacenes y ubicaciones internas
-- - Inventario actual (snapshot)
-- - Reservas (ecommerce)
-- - Documentos de inventario + Kardex (ledger)
-- - (Opcional) Compras a proveedores (PO)
-- =========================================================

-- =========================
-- 0) Extensión para UUID
-- =========================
-- Sirve para generar UUID automáticamente con uuid_generate_v4()
create extension if not exists "uuid-ossp";

-- =========================
-- 0.1) Roles + Users (para auditoría)
-- =========================

-- ---------------------------------------------------------
-- TABLA: roles
-- Para qué sirve:
-- - Define roles/jerarquías del sistema (admin, moderador, asesor, etc.)
-- Qué información guarda:
-- - Nombre del rol y descripción
-- Columnas (ES):
-- - role_id: id del rol (uuid)
-- - name: nombre del rol
-- - description: descripción del rol
-- - created_at: fecha de creación
-- ---------------------------------------------------------
create table roles (
  role_id uuid primary key default uuid_generate_v4(),
  name varchar(60) not null unique,
  description text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- TABLA: users
-- Para qué sirve:
-- - Usuarios del sistema. Se usa para saber "quién hizo qué" (auditoría).
-- Qué información guarda:
-- - Datos básicos de usuario + rol asignado
-- Columnas (ES):
-- - id: id del usuario (uuid)
-- - name: nombre del usuario
-- - email: correo (único)
-- - password: contraseña hasheada
-- - deleted: borrado lógico (true/false)
-- - avatar_url: url del avatar (opcional)
-- - role_id: rol del usuario (FK a roles)
-- - created_at: fecha de creación
-- ---------------------------------------------------------
create table users (
  id uuid primary key default uuid_generate_v4(),
  name varchar(180) not null,
  email varchar(180) not null unique,
  password varchar(255) not null,
  deleted boolean not null default false,
  failed_login_attempts int not null default 0,
  lockout_level int not null default 0,
  locked_until timestamp null,
  security_disabled_at timestamp null,
  avatar_url varchar(500),
  role_id uuid not null references roles(role_id),
  created_at timestamptz not null default now()
);

-- Índice para filtrar rápido por rol
create index if not exists idx_users_role on users(role_id);

-- =========================
-- 1) Catálogo
-- =========================

-- ---------------------------------------------------------
-- TABLA: products
-- Para qué sirve:
-- - Catálogo maestro de productos (concepto general).
-- Qué información guarda:
-- - Nombre, descripción y estado activo/inactivo.
-- Columnas (ES):
-- - product_id: id del producto
-- - name: nombre del producto
-- - description: descripción
-- - base_unit_id: unidad base del producto (FK units)
-- - variant_default_id: variante por defecto (FK product_variants)
-- - type: tipo de producto (enum product_type)
-- - is_active: si está disponible/activo
-- - created_at: fecha de creación
-- - updated_at: fecha de actualización
-- ---------------------------------------------------------
create type product_type as enum ('PRIMA', 'FINISHED');

create table products (
  product_id uuid primary key default uuid_generate_v4(),
  name varchar(180) not null,
  description text,
  base_unit_id uuid not null,
  variant_default_id uuid,
  type product_type,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- TABLA: product_variants
-- Para qué sirve:
-- - Variantes/SKU del producto (lo que realmente se vende y se stockea).
-- Qué información guarda:
-- - SKU, código de barras, atributos (tamaño, tipo, etc.), precio y costo.
-- Columnas (ES):
-- - variant_id: id de la variante/SKU
-- - product_id: producto padre (FK products)
-- - sku: código SKU (único)
-- - barcode: código de barras (único opcional)
-- - attributes: atributos en JSON (ej: {"talla":"M","color":"Azul"})
-- - price: precio de venta
-- - cost: costo (opcional)
-- - default_variant: variante por defecto del producto
-- - is_active: activo/inactivo
-- - created_at: fecha de creación
-- ---------------------------------------------------------
create table product_variants (
  variant_id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(product_id),
  sku varchar(80) not null unique,
  barcode varchar(80) unique,
  attributes jsonb not null default '{}'::jsonb,
  price numeric(12,2) not null,
  cost numeric(12,2),
  default_variant boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Índice para listar variantes por producto
create index idx_variants_product on product_variants(product_id);

-- FK: variante por defecto del producto
alter table products
  add constraint fk_products_variant_default
  foreign key (variant_default_id) references product_variants(variant_id);

-- ---------------------------------------------------------
-- TABLA: units
-- Para qué sirve:
-- - Catálogo de unidades de medida (KG, GR, LT, UND, etc.).
-- Qué información guarda:
-- - Código y nombre de la unidad.
-- Columnas (ES):
-- - unit_id: id de la unidad (uuid)
-- - code: código único de la unidad
-- - name: nombre descriptivo
-- ---------------------------------------------------------
create table units (
  unit_id uuid primary key default uuid_generate_v4(),
  code varchar(50) not null unique,
  name varchar(180) not null
);

-- FK: unidad base del producto
alter table products
  add constraint fk_products_base_unit
  foreign key (base_unit_id) references units(unit_id);

-- ---------------------------------------------------------
-- TABLA: product_equivalences
-- Para qué sirve:
-- - Factores de conversión entre unidades por producto.
-- Qué información guarda:
-- - Producto, unidad origen/destino y factor de conversión.
-- Columnas (ES):
-- - equivalence_id: id de equivalencia
-- - product_id: producto (FK products)
-- - from_unit_id: unidad origen (FK units)
-- - to_unit_id: unidad destino (FK units)
-- - factor: factor multiplicador de conversión
-- ---------------------------------------------------------
create table product_equivalences (
  equivalence_id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(product_id) on delete cascade,
  from_unit_id uuid not null references units(unit_id),
  to_unit_id uuid not null references units(unit_id),
  factor numeric(12,6) not null check (factor > 0)
);

create index idx_product_equivalences_product on product_equivalences(product_id);

-- ---------------------------------------------------------
-- TABLA: product_recipes
-- Para qué sirve:
-- - Recetas/BOM para fabricar una variante terminada.
-- Qué información guarda:
-- - Variante terminada, variante prima, cantidad y merma.
-- Columnas (ES):
-- - recipe_id: id receta
-- - finished_variant_id: variante final (FK product_variants)
-- - prima_variant_id: variante prima insumo (FK product_variants)
-- - quantity: cantidad requerida
-- - waste: merma (opcional)
-- ---------------------------------------------------------
create table product_recipes (
  recipe_id uuid primary key default uuid_generate_v4(),
  finished_variant_id uuid not null references product_variants(variant_id) on delete cascade,
  prima_variant_id uuid not null references product_variants(variant_id),
  quantity numeric(12,6) not null check (quantity > 0),
  waste numeric(12,6)
);

create index idx_product_recipes_finished on product_recipes(finished_variant_id);
create index idx_product_recipes_prima on product_recipes(prima_variant_id);

-- =========================
-- 2) Almacenes
-- =========================

-- ---------------------------------------------------------
-- TABLA: warehouses
-- Para qué sirve:
-- - Representa cada almacén físico (multi-almacén).
-- Qué información guarda:
-- - Nombre, distrito y dirección.
-- Columnas (ES):
-- - warehouse_id: id del almacén
-- - name: nombre del almacén
-- - distrito: distrito asociado (opcional)
-- - address: dirección (opcional)
-- - is_active: activo/inactivo
-- - created_at: fecha de creación
-- ---------------------------------------------------------
create table warehouses (
  warehouse_id uuid primary key default uuid_generate_v4(),
  name varchar(120) not null,
  distrito varchar(120),
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- TABLA: warehouse_locations
-- Para qué sirve:
-- - Ubicaciones internas dentro de un almacén (estantes, pasillos, etc.)
-- - Es opcional, pero sirve para orden real.
-- Qué información guarda:
-- - Código interno por almacén y descripción.
-- Columnas (ES):
-- - location_id: id de ubicación
-- - warehouse_id: almacén dueño (FK)
-- - code: código (ej: "A-01", "RACK-2")
-- - description: descripción
-- - is_active: activo/inactivo
-- ---------------------------------------------------------
create table warehouse_locations (
  location_id uuid primary key default uuid_generate_v4(),
  warehouse_id uuid not null references warehouses(warehouse_id),
  code varchar(60) not null,
  description text,
  is_active boolean not null default true,
  unique (warehouse_id, code)
);

create index idx_locations_wh on warehouse_locations(warehouse_id);

-- =========================
-- 3) Inventory snapshot
-- =========================

-- ---------------------------------------------------------
-- TABLA: inventory
-- Para qué sirve:
-- - "Foto" del stock actual por almacén/ubicación/SKU.
-- - Esta tabla NO guarda historial, solo el estado actual.
-- Qué información guarda:
-- - on_hand (en mano), reserved (reservado), available (disponible calculado).
-- Columnas (ES):
-- - warehouse_id: almacén
-- - location_id: ubicación interna (opcional)
-- - variant_id: SKU/variante
-- - on_hand: stock físico disponible en mano
-- - reserved: stock reservado (no se puede vender)
-- - available: disponible = on_hand - reserved (calculado)
-- - updated_at: última actualización del snapshot
-- ---------------------------------------------------------
create table inventory (
  warehouse_id uuid not null references warehouses(warehouse_id),
  location_id uuid references warehouse_locations(location_id),
  variant_id uuid not null references product_variants(variant_id),

  on_hand int not null default 0,
  reserved int not null default 0,
  available int generated always as (on_hand - reserved) stored,

  updated_at timestamptz not null default now(),

  primary key (warehouse_id, location_id, variant_id)
);

create index idx_inventory_variant on inventory(variant_id);
create index idx_inventory_wh_variant on inventory(warehouse_id, variant_id);

-- =========================
-- 4) Reservas (ecommerce)
-- =========================

-- Enum de estados de reserva
-- ACTIVE: reservada
-- RELEASED: liberada
-- CONSUMED: consumida (se convirtió en venta)
-- EXPIRED: vencida
create type reservation_status as enum ('ACTIVE','RELEASED','CONSUMED','EXPIRED');

-- ---------------------------------------------------------
-- TABLA: stock_reservations
-- Para qué sirve:
-- - Evita sobreventa: reserva stock temporalmente (carrito/pedido/manual).
-- Qué información guarda:
-- - Cantidad reservada, referencia (pedido/carrito), expiración y usuario.
-- Columnas (ES):
-- - reservation_id: id de reserva
-- - warehouse_id: almacén
-- - location_id: ubicación (opcional)
-- - variant_id: SKU
-- - quantity: cantidad reservada
-- - status: estado de la reserva
-- - reference_type: tipo referencia (ORDER/CART/MANUAL)
-- - reference_id: id de referencia (uuid del pedido/carrito)
-- - expires_at: fecha/hora de expiración
-- - created_by: usuario que creó la reserva (FK users)
-- - created_at: fecha de creación
-- ---------------------------------------------------------
create table stock_reservations (
  reservation_id uuid primary key default uuid_generate_v4(),
  warehouse_id uuid not null references warehouses(warehouse_id),
  location_id uuid references warehouse_locations(location_id),
  variant_id uuid not null references product_variants(variant_id),

  quantity int not null check (quantity > 0),
  status reservation_status not null default 'ACTIVE',

  reference_type varchar(30) not null, -- ORDER, CART, MANUAL
  reference_id uuid not null,
  expires_at timestamptz,

  created_by uuid references users(id), -- quién creó la reserva (opcional, pero recomendado)
  created_at timestamptz not null default now()
);

create index idx_res_active on stock_reservations(status, variant_id, warehouse_id);
create index idx_res_created_by on stock_reservations(created_by);

-- =========================
-- 5) Documentos + Kardex
-- =========================

-- Enum de tipos de documentos de inventario:
-- PURCHASE_RECEIPT: ingreso por compra
-- SALE_SHIPMENT: salida por venta/entrega
-- RETURN_IN: devolución que regresa al stock
-- RETURN_OUT: devolución que sale
-- ADJUSTMENT: ajuste manual (corrección)
-- TRANSFER: transferencia entre almacenes
-- CYCLE_COUNT: conteo/cierre
create type inv_doc_type as enum (
  'PURCHASE_RECEIPT',
  'SALE_SHIPMENT',
  'RETURN_IN',
  'RETURN_OUT',
  'ADJUSTMENT',
  'TRANSFER',
  'CYCLE_COUNT'
);

-- Estados del documento:
-- DRAFT: borrador (no afecta stock)
-- POSTED: contabilizado (sí afecta stock)
-- CANCELLED: cancelado
create type inv_doc_status as enum ('DRAFT','POSTED','CANCELLED');

-- ---------------------------------------------------------
-- TABLA: documents_series
-- Para qué sirve:
-- - Define series de numeración por tipo de documento (y opcional por almacén).
-- Qué información guarda:
-- - Código/Nombre de la serie, tipo de documento, correlativo y formato.
-- Columnas (ES):
-- - series_id: id de la serie (uuid)
-- - code: código corto (ej: ING, SAL, TRA)
-- - name: nombre de la serie
-- - doc_type: tipo de documento (enum inv_doc_type)
-- - warehouse_id: almacén (opcional)
-- - next_number: correlativo actual
-- - padding: longitud del correlativo (000001)
-- - separator: separador entre código y número (ING-000001)
-- - is_active: activo/inactivo
-- - created_at: fecha de creación
-- - updated_at: fecha de actualización
-- ---------------------------------------------------------
create table documents_series (
  series_id uuid primary key default uuid_generate_v4(),

  code varchar(10) not null,                 -- ING, SAL, TRA, AJU
  name varchar(80) not null,                 -- "Serie Ingresos Principal"
  doc_type inv_doc_type not null,            -- tu enum (TRANSFER, ADJUSTMENT, etc.)

  warehouse_id uuid references warehouses(warehouse_id), -- opcional si numeras por almacén
  next_number integer not null default 1,     -- correlativo actual
  padding smallint not null default 6,        -- 000001
  separator varchar(2) not null default '-',  -- ING-000001

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_series unique (code, doc_type, warehouse_id)
);

-- ---------------------------------------------------------
-- TABLA: inventory_documents
-- Para qué sirve:
-- - Cabecera del documento de inventario. Es el "evento" que explica un movimiento.
-- - Aquí se guarda la auditoría: quién creó y quién posteó.
-- Qué información guarda:
-- - Tipo doc, estado, almacenes origen/destino, referencias externas.
-- Columnas (ES):
-- - doc_id: id del documento
-- - doc_type: tipo de documento (enum)
-- - status: estado (draft/posted/cancelled)
-- - from_warehouse_id: almacén origen (si aplica)
-- - to_warehouse_id: almacén destino (si aplica)
-- - reference_type: tipo referencia (PO/ORDER/RMA/etc)
-- - reference_id: id referencia externa
-- - note: nota libre
-- - created_by: usuario creador
-- - posted_by: usuario que contabilizó (ejecutó el movimiento real)
-- - posted_at: fecha/hora en que se posteó
-- - created_at: fecha creación del documento
-- ---------------------------------------------------------
create table inventory_documents (
  doc_id uuid primary key default uuid_generate_v4(),
  doc_type inv_doc_type not null,
  series_id uuid references documents_series(series_id),
  correlative varchar(30),
  status inv_doc_status not null default 'DRAFT',

  from_warehouse_id uuid references warehouses(warehouse_id),
  to_warehouse_id uuid references warehouses(warehouse_id),

  reference_type varchar(30),  -- PO, ORDER, RMA, etc
  reference_id uuid,

  note text,

  -- Auditoría:
  created_by uuid references users(id), -- quién lo creó
  posted_by uuid references users(id),  -- quién lo posteó (quién ejecutó el movimiento real)
  posted_at timestamptz,

  created_at timestamptz not null default now()
);

create index idx_inv_docs_type_date on inventory_documents(doc_type, created_at desc);
create index idx_inv_docs_created_by on inventory_documents(created_by);
create index idx_inv_docs_posted_by on inventory_documents(posted_by);

-- ---------------------------------------------------------
-- TABLA: inventory_document_items
-- Para qué sirve:
-- - Detalle del documento: qué SKU y qué cantidad se mueve.
-- Qué información guarda:
-- - SKU, cantidad, ubicaciones origen/destino (si se usa locations), costo unitario.
-- Columnas (ES):
-- - item_id: id del item
-- - doc_id: documento padre (FK)
-- - variant_id: SKU
-- - from_location_id: ubicación origen (opcional)
-- - to_location_id: ubicación destino (opcional)
-- - quantity: cantidad movida
-- - unit_cost: costo unitario (útil para compras o valorización)
-- ---------------------------------------------------------
create table inventory_document_items (
  item_id uuid primary key default uuid_generate_v4(),
  doc_id uuid not null references inventory_documents(doc_id) on delete cascade,

  variant_id uuid not null references product_variants(variant_id),
  from_location_id uuid references warehouse_locations(location_id),
  to_location_id uuid references warehouse_locations(location_id),

  quantity int not null check (quantity > 0),
  unit_cost numeric(12,2)
);

create index idx_doc_items_doc on inventory_document_items(doc_id);
create index idx_doc_items_variant on inventory_document_items(variant_id);

-- Dirección del movimiento:
-- IN: entrada
-- OUT: salida
create type inv_direction as enum ('IN','OUT');

-- ---------------------------------------------------------
-- TABLA: inventory_ledger
-- Para qué sirve:
-- - Kardex / registro histórico inmutable de movimientos.
-- - Es la verdad histórica: de aquí salen reportes, auditoría y métricas.
-- Qué información guarda:
-- - doc_id, almacén, SKU, dirección, cantidad y costo.
-- Columnas (ES):
-- - ledger_id: id incremental del kardex
-- - doc_id: documento que originó el movimiento
-- - warehouse_id: almacén afectado
-- - location_id: ubicación (opcional)
-- - variant_id: SKU afectado
-- - direction: IN/OUT
-- - quantity: cantidad
-- - unit_cost: costo unitario (si aplica)
-- - created_at: fecha/hora del asiento en kardex
-- ---------------------------------------------------------
create table inventory_ledger (
  ledger_id bigserial primary key,
  doc_id uuid not null references inventory_documents(doc_id),
  series_id uuid references documents_series(series_id),

  warehouse_id uuid not null references warehouses(warehouse_id),
  location_id uuid references warehouse_locations(location_id),
  variant_id uuid not null references product_variants(variant_id),

  direction inv_direction not null,
  quantity int not null check (quantity > 0),
  unit_cost numeric(12,2),

  created_at timestamptz not null default now()
);

create index idx_ledger_variant_date on inventory_ledger(variant_id, created_at desc);
create index idx_ledger_doc on inventory_ledger(doc_id);

-- =========================
-- 6) Reorden (stock “inteligente”)
-- =========================

-- ---------------------------------------------------------
-- TABLA: reorder_rules
-- Para qué sirve:
-- - Reglas por almacén y SKU para alertas y reposición (stock inteligente).
-- Qué información guarda:
-- - mínimos, punto de reorden, máximo sugerido, lead time.
-- Columnas (ES):
-- - rule_id: id regla
-- - warehouse_id: almacén
-- - variant_id: SKU
-- - min_qty: mínimo deseado
-- - reorder_point: punto de reorden (cuando bajar de aquí, avisar)
-- - max_qty: máximo objetivo (opcional)
-- - lead_time_days: días que tarda en llegar reposición
-- ---------------------------------------------------------
create table reorder_rules (
  rule_id uuid primary key default uuid_generate_v4(),
  warehouse_id uuid not null references warehouses(warehouse_id),
  variant_id uuid not null references product_variants(variant_id),

  min_qty int not null default 0,
  reorder_point int not null default 0,
  max_qty int,
  lead_time_days int not null default 0,

  unique (warehouse_id, variant_id)
);

-- =========================
-- 7) Proveedores + Compras (opcional pero recomendado)
-- =========================

-- ---------------------------------------------------------
-- TABLA: suppliers
-- Para qué sirve:
-- - Catálogo de proveedores (para compras).
-- Qué información guarda:
-- - nombre, contacto, dirección.
-- Columnas (ES):
-- - supplier_id: id proveedor
-- - name: nombre
-- - phone: teléfono
-- - email: correo
-- - address: dirección
-- - created_at: fecha de creación
-- ---------------------------------------------------------
create type supplier_doc_type as enum ('06','01','04');

create table suppliers (
  supplier_id uuid primary key default uuid_generate_v4(),
  document_type supplier_doc_type not null,
  document_number varchar(30) not null,
  name varchar(160),
  last_name varchar(160),
  trade_name varchar(200),
  phone varchar(40),
  email varchar(120),
  address text,
  note text,
  lead_time_days int,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_type, document_number)
);

-- ---------------------------------------------------------
-- TABLA: supplier_variants
-- Para qué sirve:
-- - Relación proveedor <-> SKU (qué proveedor vende qué SKU).
-- Qué información guarda:
-- - sku de proveedor, último costo, lead time.
-- Columnas (ES):
-- - supplier_id: proveedor
-- - variant_id: SKU
-- - supplier_sku: código del proveedor
-- - last_cost: último costo registrado
-- - lead_time_days: tiempo de entrega
-- ---------------------------------------------------------
create table supplier_variants (
  supplier_id uuid not null references suppliers(supplier_id),
  variant_id uuid not null references product_variants(variant_id),
  supplier_sku varchar(80),
  last_cost numeric(12,2),
  lead_time_days int,
  primary key (supplier_id, variant_id)
);

-- Estados de orden de compra:
-- DRAFT: borrador
-- SENT: enviado al proveedor
-- PARTIAL: recibido parcial
-- RECEIVED: recibido completo
-- CANCELLED: cancelado
create type po_status as enum ('DRAFT','SENT','PARTIAL','RECEIVED','CANCELLED');

-- ---------------------------------------------------------
-- TABLA: purchase_orders
-- Para qué sirve:
-- - Orden de compra (cabecera) para reponer stock.
-- Qué información guarda:
-- - proveedor, almacén destino, estado, fecha esperada, nota.
-- Columnas (ES):
-- - po_id: id orden compra
-- - supplier_id: proveedor
-- - warehouse_id: almacén que recibirá
-- - status: estado de la OC
-- - expected_at: fecha esperada (día)
-- - note: observación
-- - created_at: fecha creación
-- ---------------------------------------------------------
create table purchase_orders (
  po_id uuid primary key default uuid_generate_v4(),
  supplier_id uuid not null references suppliers(supplier_id),
  warehouse_id uuid not null references warehouses(warehouse_id),
  status po_status not null default 'DRAFT',
  expected_at date,
  note text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- TABLA: purchase_order_items
-- Para qué sirve:
-- - Detalle de la orden de compra (qué SKU y qué cantidad se compra).
-- Qué información guarda:
-- - SKU, cantidad, costo.
-- Columnas (ES):
-- - po_item_id: id detalle
-- - po_id: orden compra padre
-- - variant_id: SKU comprado
-- - quantity: cantidad
-- - unit_cost: costo unitario
-- ---------------------------------------------------------
create table purchase_order_items (
  po_item_id uuid primary key default uuid_generate_v4(),
  po_id uuid not null references purchase_orders(po_id) on delete cascade,
  variant_id uuid not null references product_variants(variant_id),
  quantity int not null check (quantity > 0),
  unit_cost numeric(12,2) not null
);

-- =========================
-- 8) Producción
-- =========================

-- Estados de orden de producción:
-- DRAFT: borrador
-- IN_PROGRESS: en producción
-- COMPLETED: finalizada
-- CANCELLED: cancelada
create type production_status as enum ('DRAFT','IN_PROGRESS','COMPLETED','CANCELLED');

-- ---------------------------------------------------------
-- TABLA: production_orders
-- Para qué sirve:
-- - Cabecera de órdenes de producción.
-- Qué información guarda:
-- - Almacén origen/destino, serie, correlativo, estado y auditoría.
-- Columnas (ES):
-- - production_id: id de orden producción
-- - from_warehouse_id: almacén origen
-- - to_warehouse_id: almacén destino
-- - serie_id: serie documental asociada
-- - correlative: correlativo de la orden
-- - status: estado de la orden
-- - reference: referencia externa/interna
-- - manufacture_time: tiempo estimado/fabricación
-- - created_by: usuario creador (texto)
-- - updated_by: usuario que actualizó (texto, opcional)
-- - created_at: fecha creación
-- - updated_at: fecha actualización
-- ---------------------------------------------------------
create table production_orders (
  production_id uuid primary key default uuid_generate_v4(),
  from_warehouse_id uuid not null references warehouses(warehouse_id),
  to_warehouse_id uuid not null references warehouses(warehouse_id),
  serie_id uuid not null references documents_series(series_id),
  correlative int not null,
  status production_status not null default 'DRAFT',
  reference varchar not null,
  manufacture_time int not null,
  created_by varchar not null,
  updated_by varchar,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_production_orders_status on production_orders(status);
create index idx_production_orders_created_at on production_orders(created_at desc);
create index idx_production_orders_from_wh on production_orders(from_warehouse_id);
create index idx_production_orders_to_wh on production_orders(to_warehouse_id);

-- ---------------------------------------------------------
-- TABLA: production_order_items
-- Para qué sirve:
-- - Detalle de la orden de producción.
-- Qué información guarda:
-- - Variante final a fabricar, ubicación origen/destino, cantidad y costo unitario.
-- Columnas (ES):
-- - item_id: id del item
-- - production_id: orden producción padre
-- - finished_variant_id: variante final
-- - from_location_id: ubicación origen
-- - to_location_id: ubicación destino
-- - quantity: cantidad
-- - unit_cost: costo unitario
-- ---------------------------------------------------------
create table production_order_items (
  item_id uuid primary key default uuid_generate_v4(),
  production_id uuid not null references production_orders(production_id) on delete cascade,
  finished_variant_id uuid not null references product_variants(variant_id),
  from_location_id uuid not null references warehouse_locations(location_id),
  to_location_id uuid not null references warehouse_locations(location_id),
  quantity int not null check (quantity > 0),
  unit_cost numeric not null
);

create index idx_production_items_production on production_order_items(production_id);
create index idx_production_items_finished_variant on production_order_items(finished_variant_id);
