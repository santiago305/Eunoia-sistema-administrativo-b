-- =========================================================
-- STOCK + CATiLOGO (PostgreSQL)
-- con USERS/ROLES y auditori­a de movimientos
-- =========================================================
-- Esta BD cubre:
-- - Catalogo (productos y variantes/SKU)
-- - Almacenes y ubicaciones internas
-- - Inventario actual (snapshot)
-- - Reservas (ecommerce)
-- - Documentos de inventario + Kardex (ledger)
-- - (Opcional) Compras a proveedores (PO)
-- =========================================================

-- =========================
-- 0) Extensión para UUID
-- =========================
-- Sirve para generar UUID automaticamente con uuid_generate_v4()
create extension if not exists "uuid-ossp";

-- =========================
-- 0.1) Roles + Users (para auditori­a)
-- =========================

-- ---------------------------------------------------------
-- TABLA: roles
-- Para que sirve:
-- - Define roles/jerarqui­as del sistema (admin, moderador, asesor, etc.)
-- Que información guarda:
-- - Descripción del rol
-- Columnas (ES):
-- - role_id: id del rol (uuid)
-- - description: descripción del rol
-- - deleted: borrado lógico (true/false)
-- - created_at: fecha de creación
-- ---------------------------------------------------------
create table roles (
  role_id uuid primary key default uuid_generate_v4(),
  description text not null unique,
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);

-- Refuerzo de unicidad semantica: evita duplicados por mayusculas/espacios
-- (ej. "admin", " Admin ", "ADMIN")
create unique index if not exists ux_roles_description_normalized
  on roles (lower(btrim(description)));

-- ---------------------------------------------------------
-- TABLA: users
-- Para que sirve:
-- - Usuarios del sistema. Se usa para saber "quien hizo que" (auditori­a).
-- Que información guarda:
-- - Datos basicos de usuario + rol asignado
-- Columnas (ES):
-- - user_id: id del usuario (uuid)
-- - name: nombre del usuario
-- - email: correo (unico)
-- - password: contraseña hasheada
-- - deleted: borrado lógico (true/false)
-- - avatar_url: url del avatar (opcional)
-- - telefono: telefono del usuario (opcional)
-- - role_id: rol del usuario (FK a roles)
-- - created_at: fecha de creación
-- ---------------------------------------------------------
create table users (
  user_id uuid primary key default uuid_generate_v4(),
  name varchar(180) not null,
  email varchar(180) not null unique,
  password varchar(255) not null,
  deleted boolean not null default false,
  failed_login_attempts int not null default 0,
  lockout_level int not null default 0,
  locked_until timestamp null,
  security_disabled_at timestamp null,
  avatar_url varchar(500),
  telefono varchar(30),
  role_id uuid not null references roles(role_id),
  created_at timestamptz not null default now()
);

-- indice para filtrar rapido por rol
create index if not exists idx_users_role on users(role_id);

-- =========================
-- 0.2) Companies + Payment Methods
-- =========================

-- ---------------------------------------------------------
-- TABLA: companies
-- Para que sirve:
-- - Empresas del sistema.
-- Columnas (ES):
-- - company_id: id de la empresa (uuid)
-- - name: nombre
-- - ruc: ruc
-- - ubigeo: ubigeo
-- - department: departamento
-- - province: provincia
-- - district: distrito
-- - urbanization: urbanizacion
-- - address: direccion
-- - phone: telefono
-- - email: correo
-- - cod_local: codigo local
-- - sol_user: usuario sol
-- - sol_pass: clave sol
-- - logo_path: ruta de logo
-- - production: si es ambiente productivo
-- - is_active: activo/inactivo
-- - created_at: fecha de creacion
-- - update_at: fecha de actualizacion
-- ---------------------------------------------------------
create table companies (
  company_id uuid primary key default uuid_generate_v4(),
  name varchar(50) not null,
  ruc varchar(30) not null,
  ubigeo varchar(30),
  department varchar(30),
  province varchar(30),
  district varchar(30),
  urbanization varchar(100),
  address varchar(300),
  phone varchar(15),
  email varchar(120),
  cod_local varchar(30),
  sol_user varchar,
  sol_pass varchar,
  logo_path varchar(500),
  cert_path varchar(500),
  production boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (company_id)
);

-- ---------------------------------------------------------
-- TABLA: payment_methods
-- Para que sirve:
-- - Catalogo de metodos de pago.
-- Columnas (ES):
-- - method_id: id del metodo (uuid)
-- - name: nombre del metodo
-- - description: descripcion corta
-- - is_active: activo/inactivo
-- ---------------------------------------------------------
create table payment_methods (
    method_id uuid primary key default uuid_generate_v4(),
    name varchar(300) not null,
    description varchar(20),
    is_active boolean not null,
    primary key (method_id)
  );

-- ---------------------------------------------------------
-- TABLA: company_methods
-- Para que sirve:
-- - Relacion empresas <-> metodos de pago.
-- Columnas (ES):
-- - method_id: metodo de pago (FK a payment_methods)
-- - company_id: empresa (FK a companies)
-- ---------------------------------------------------------
create table company_methods (
    method_id uuid not null,
    company_id uuid not null,
    number varchar(30),
    primary key (company_id, method_id),
  constraint fk_company_methods_method
    foreign key (method_id) references payment_methods(method_id),
  constraint fk_company_methods_company
    foreign key (company_id) references companies(company_id)
);

-- ---------------------------------------------------------
-- TABLA: supplier_methods
-- Para que sirve:
-- - Relacion proveedores <-> metodos de pago.
-- Columnas (ES):
-- - method_id: metodo de pago (FK a payment_methods)
-- - supplier_id: proveedor (FK a suppliers)
-- ---------------------------------------------------------
create table supplier_methods (
    method_id uuid not null,
    supplier_id uuid,
    number varchar(30),
    primary key (supplier_id, method_id),
  constraint fk_supplier_methods_method
    foreign key (method_id) references payment_methods(method_id),
  constraint fk_supplier_methods_supplier
    foreign key (supplier_id) references suppliers(supplier_id)
);

-- =========================
-- 1) Catalogo
-- =========================

-- ---------------------------------------------------------
-- TABLA: products
-- Para que sirve:
-- - Catalogo maestro de productos (concepto general).
-- Que información guarda:
-- - Nombre, descripción y estado activo/inactivo.
-- Columnas (ES):
-- - product_id: id del producto
-- - name: nombre del producto
-- - description: descripción
-- - base_unit_id: unidad base del producto (FK units)
-- - sku: código SKU (unico)
-- - barcode: código de barras (unico opcional)
-- - attributes: atributos en JSON (ej: {"talla":"M","color":"Azul"})
-- - price: precio de venta
-- - cost: costo
-- - type: tipo de producto (enum product_type)
-- - is_active: si esta disponible/activo
-- - created_at: fecha de creación
-- - updated_at: fecha de actualización
-- ---------------------------------------------------------
create type product_type as enum ('PRIMA', 'FINISHED');

create table products (
  product_id uuid primary key default uuid_generate_v4(),
  base_unit_id uuid not null, 
  name varchar(180) not null,
  description text,
  sku varchar(80) not null unique,
  barcode varchar(80) unique,
  attributes jsonb not null default '{}'::jsonb,
  price numeric(12,2) not null,
  cost numeric(12,2) not null,
  type product_type,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- 1.1) Stock Items (super tipo)
-- =========================

-- ---------------------------------------------------------
-- TABLA: stock_items
-- Para que sirve:
-- - Identidad unica stockeable del modelo legacy por producto.
-- Columnas (ES):
-- - stock_item_id: id del stock item (uuid)
-- - type: tipo de item (enum stock_item_type legacy)
-- - product_id: FK a products
-- - is_active: activo/inactivo
-- - created_at: fecha de creación
-- ---------------------------------------------------------
create type stock_item_type as enum ('PRODUCT');

create table stock_items (
  stock_item_id uuid primary key default uuid_generate_v4(),
  type stock_item_type not null,
  product_id uuid references products(product_id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint chk_stock_items_type_ref check (
    (type = 'PRODUCT' and product_id is not null)
  )
);

create index idx_stock_items_type on stock_items(type);
create unique index ux_stock_items_product on stock_items(product_id);

-- ---------------------------------------------------------
-- TABLA: sku_counters
-- Para que sirve:
-- - Controla el correlativo interno para generación de SKU.
-- Que información guarda:
-- -Usado por cada contador.
-- Columnas (ES):
-- - counter_id: id del contador (string)
-- - last_number: Ultimo numero asignado
-- ---------------------------------------------------------
create table sku_counters (
  counter_id uuid primary key default uuid_generate_v4(),
  last_number int not null
);

-- ---------------------------------------------------------
-- TABLA: units
-- Para que sirve:
-- - Catalogo de unidades de medida (KG, GR, LT, UND, etc.).
-- Que información guarda:
-- - Código y nombre de la unidad.
-- Columnas (ES):
-- - unit_id: id de la unidad (uuid)
-- - code: código unico de la unidad
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
-- Para que sirve:
-- - Factores de conversión entre unidades por producto.
-- Que información guarda:
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
-- Para que sirve:
-- - Recetas/BOM legacy por producto terminado.
-- Que información guarda:
-- - Producto terminado, producto prima, cantidad y merma.
-- Columnas (ES):
-- - recipe_id: id receta
-- - finished_type: tipo legacy del terminado (solo PRODUCT)
-- - finished_product_id: id del producto terminado
-- - prima_product_id: producto prima insumo (FK products)
-- - quantity: cantidad requerida
-- - waste: merma (opcional)
-- ---------------------------------------------------------
create table product_recipes (
  recipe_id uuid primary key default uuid_generate_v4(),
  finished_type stock_item_type not null,
  finished_product_id uuid not null references products(product_id) on delete cascade,
  prima_product_id uuid not null references products(product_id),
  quantity numeric(12,6) not null check (quantity > 0),
  waste numeric(12,6)
);

create index idx_product_recipes_finished on product_recipes(finished_product_id);
create index idx_product_recipes_prima on product_recipes(prima_product_id);

-- ---------------------------------------------------------
-- TABLA: catalog_publications
-- Que informacion guarda:
-- - Publicacion comercial legacy por canal para productos.
-- Columnas (ES):
-- - publication_id: id publicacion
-- - channel_code: codigo del canal/tienda
-- - source_type: PRODUCT
-- - item_id: id del item publicado
-- - is_visible: si se muestra en el canal
-- - sort_order: orden manual del canal
-- - price_override: precio comercial opcional por canal
-- - display_name_override: nombre comercial opcional por canal
-- ---------------------------------------------------------
create table catalog_publications (
  publication_id uuid primary key default uuid_generate_v4(),
  channel_code varchar(80) not null,
  source_type stock_item_type not null,
  item_id uuid not null,
  is_visible boolean not null default true,
  sort_order int not null default 0,
  price_override numeric(12,2) null,
  display_name_override varchar(255) null,
  created_at timestamptz not null default now(),
  unique (channel_code, source_type, item_id)
);

create index idx_catalog_publications_channel on catalog_publications(channel_code);

-- =========================
-- 2) Almacenes
-- =========================

-- ---------------------------------------------------------
-- TABLA: warehouses
-- Para que sirve:
-- - Representa cada almacen fi­sico (multi-almacen).
-- Que información guarda:
-- - Nombre, distrito y dirección.
-- Columnas (ES):
-- - warehouse_id: id del almacen
-- - name: nombre del almacen
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
-- Para que sirve:
-- - Ubicaciones internas dentro de un almacen (estantes, pasillos, etc.)
-- - Es opcional, pero sirve para orden real.
-- Que información guarda:
-- - Código interno por almacen y descripción.
-- Columnas (ES):
-- - location_id: id de ubicación
-- - warehouse_id: almacen duei±o (FK)
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
-- Para que sirve:
-- - "Foto" del stock actual por almacen/ubicación/SKU.
-- - Esta tabla NO guarda historial, solo el estado actual.
-- Que información guarda:
-- - on_hand (en mano), reserved (reservado), available (disponible calculado).
-- Columnas (ES):
-- - warehouse_id: almacen
-- - location_id: ubicación interna (opcional)
-- - stock_item_id: item stockeable
-- - on_hand: stock fi­sico disponible en mano
-- - reserved: stock reservado (no se puede vender)
-- - available: disponible = on_hand - reserved (calculado)
-- - updated_at: ultima actualización del snapshot
-- ---------------------------------------------------------
create table inventory (
  warehouse_id uuid not null references warehouses(warehouse_id),
  location_id uuid references warehouse_locations(location_id),
  stock_item_id uuid not null references stock_items(stock_item_id),

  on_hand int not null default 0,
  reserved int not null default 0,
  available int generated always as (on_hand - reserved) stored,

  updated_at timestamptz not null default now(),

  primary key (warehouse_id, location_id, stock_item_id)
);

create index idx_inventory_stock_item on inventory(stock_item_id);
create index idx_inventory_wh_stock_item on inventory(warehouse_id, stock_item_id);

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
-- Para que sirve:
-- - Evita sobreventa: reserva stock temporalmente (carrito/pedido/manual).
-- Que información guarda:
-- - Cantidad reservada, referencia (pedido/carrito), expiración y usuario.
-- Columnas (ES):
-- - reservation_id: id de reserva
-- - warehouse_id: almacen
-- - location_id: ubicación (opcional)
-- - stock_item_id: item stockeable
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
  stock_item_id uuid not null references stock_items(stock_item_id),

  quantity int not null check (quantity > 0),
  status reservation_status not null default 'ACTIVE',

  reference_type varchar(30) not null, -- ORDER, CART, MANUAL
  reference_id uuid not null,
  expires_at timestamptz,

  created_by uuid references users(user_id), -- quien creó la reserva (opcional, pero recomendado)
  created_at timestamptz not null default now()
);

create index idx_res_active on stock_reservations(status, stock_item_id, warehouse_id);
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
-- POSTED: contabilizado (si­ afecta stock)
-- CANCELLED: cancelado
create type inv_doc_status as enum ('DRAFT','POSTED','CANCELLED');

-- ---------------------------------------------------------
-- TABLA: documents_series
-- Para que sirve:
-- - Define series de numeración por tipo de documento (y opcional por almacen).
-- Que información guarda:
-- - Código/Nombre de la serie, tipo de documento, correlativo y formato.
-- Columnas (ES):
-- - series_id: id de la serie (uuid)
-- - code: código corto (ej: ING, SAL, TRA)
-- - name: nombre de la serie
-- - doc_type: tipo de documento (enum inv_doc_type)
-- - warehouse_id: almacen (opcional)
-- - next_number: correlativo actual
-- - padding: longitud del correlativo (000001)
-- - separator: separador entre código y numero (ING-000001)
-- - is_active: activo/inactivo
-- - created_at: fecha de creación
-- - updated_at: fecha de actualización
-- ---------------------------------------------------------
create table documents_series (
  series_id uuid primary key default uuid_generate_v4(),

  code varchar(10) not null,                 -- ING, SAL, TRA, AJU
  name varchar(80) not null,                 -- "Serie Ingresos Principal"
  doc_type inv_doc_type not null,            -- tu enum (TRANSFER, ADJUSTMENT, etc.)

  warehouse_id uuid references warehouses(warehouse_id), -- opcional si numeras por almacen
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
-- Para que sirve:
-- - Cabecera del documento de inventario. Es el "evento" que explica un movimiento.
-- - Aqui­ se guarda la auditori­a: quien creó y quien posteó.
-- Que información guarda:
-- - Tipo doc, estado, almacenes origen/destino, referencias externas.
-- Columnas (ES):
-- - doc_id: id del documento
-- - doc_type: tipo de documento (enum)
-- - status: estado (draft/posted/cancelled)
-- - from_warehouse_id: almacen origen (si aplica)
-- - to_warehouse_id: almacen destino (si aplica)
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

  -- Auditori­a:
  created_by uuid references users(user_id), -- quien lo creó
  posted_by uuid references users(user_id),  -- quien lo posteó (quien ejecutó el movimiento real)
  posted_at timestamptz,

  created_at timestamptz not null default now()
);

create index idx_inv_docs_type_date on inventory_documents(doc_type, created_at desc);
create index idx_inv_docs_created_by on inventory_documents(created_by);
create index idx_inv_docs_posted_by on inventory_documents(posted_by);

-- ---------------------------------------------------------
-- TABLA: inventory_document_items
-- Para que sirve:
-- - Detalle del documento: que SKU y que cantidad se mueve.
-- Que información guarda:
-- - SKU, cantidad, ubicaciones origen/destino (si se usa locations), costo unitario.
-- Columnas (ES):
-- - item_id: id del item
-- - doc_id: documento padre (FK)
-- - stock_item_id: item stockeable
-- - from_location_id: ubicación origen (opcional)
-- - to_location_id: ubicación destino (opcional)
-- - quantity: cantidad movida
-- - unit_cost: costo unitario (util para compras o valorización)
-- ---------------------------------------------------------
create table inventory_document_items (
  item_id uuid primary key default uuid_generate_v4(),
  doc_id uuid not null references inventory_documents(doc_id) on delete cascade,

  stock_item_id uuid not null references stock_items(stock_item_id),
  from_location_id uuid references warehouse_locations(location_id),
  to_location_id uuid references warehouse_locations(location_id),

  quantity int not null check (quantity > 0),
  waste_qty numeric(12,6) not null default 0,
  unit_cost numeric(12,2),
  check (waste_qty >= 0),
  check (waste_qty <= quantity)
);

create index idx_doc_items_doc on inventory_document_items(doc_id);
create index idx_doc_items_stock_item on inventory_document_items(stock_item_id);

-- Dirección del movimiento:
-- IN: entrada
-- OUT: salida
create type inv_direction as enum ('IN','OUT');

-- ---------------------------------------------------------
-- TABLA: inventory_ledger
-- Para que sirve:
-- - Kardex / registro histórico inmutable de movimientos.
-- - Es la verdad histórica: de aqui­ salen reportes, auditori­a y metricas.
-- Que información guarda:
-- - doc_id, almacen, SKU, dirección, cantidad y costo.
-- Columnas (ES):
-- - ledger_id: id incremental del kardex
-- - doc_id: documento que originó el movimiento
-- - warehouse_id: almacen afectado
-- - location_id: ubicación (opcional)
-- - stock_item_id: item afectado
-- - direction: IN/OUT
-- - quantity: cantidad
-- - unit_cost: costo unitario (si aplica)
-- - created_at: fecha/hora del asiento en kardex
-- ---------------------------------------------------------
create table inventory_ledger (
  ledger_id bigserial primary key,
  doc_id uuid not null references inventory_documents(doc_id),
  doc_item_id uuid references inventory_document_items(item_id),
  series_id uuid references documents_series(series_id),

  warehouse_id uuid not null references warehouses(warehouse_id),
  location_id uuid references warehouse_locations(location_id),
  stock_item_id uuid not null references stock_items(stock_item_id),

  direction inv_direction not null,
  quantity int not null check (quantity > 0),
  waste_qty numeric(12,6) not null default 0,
  unit_cost numeric(12,2),
  check (waste_qty >= 0),
  check (waste_qty <= quantity),

  created_at timestamptz not null default now()
);

create index idx_ledger_stock_item_date on inventory_ledger(stock_item_id, created_at desc);
create index idx_ledger_doc on inventory_ledger(doc_id);
create index idx_ledger_doc_item on inventory_ledger(doc_item_id);

-- =========================
-- 6) Reorden (stock â€œinteligenteâ€)
-- =========================

-- ---------------------------------------------------------
-- TABLA: reorder_rules
-- Para que sirve:
-- - Reglas por almacen y SKU para alertas y reposición (stock inteligente).
-- Que información guarda:
-- - mi­nimos, punto de reorden, maximo sugerido, lead time.
-- Columnas (ES):
-- - rule_id: id regla
-- - warehouse_id: almacen
-- - stock_item_id: item stockeable
-- - min_qty: mi­nimo deseado
-- - reorder_point: punto de reorden (cuando bajar de aqui­, avisar)
-- - max_qty: maximo objetivo (opcional)
-- - lead_time_days: di­as que tarda en llegar reposición
-- ---------------------------------------------------------
create table reorder_rules (
  rule_id uuid primary key default uuid_generate_v4(),
  warehouse_id uuid not null references warehouses(warehouse_id),
  stock_item_id uuid not null references stock_items(stock_item_id),

  min_qty int not null default 0,
  reorder_point int not null default 0,
  max_qty int,
  lead_time_days int not null default 0,

  unique (warehouse_id, stock_item_id)
);

-- =========================
-- 7) Proveedores + Compras (opcional pero recomendado)
-- =========================

-- ---------------------------------------------------------
-- TABLA: suppliers
-- Para que sirve:
-- - Catalogo de proveedores (para compras).
-- Que información guarda:
-- - nombre, contacto, dirección.
-- Columnas (ES):
-- - supplier_id: id proveedor
-- - name: nombre
-- - phone: telefono
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

-- Estados de orden de compra:
-- DRAFT: borrador
-- SENT: enviado al proveedor
-- PARTIAL: recibido parcial
-- RECEIVED: recibido completo
-- CANCELLED: cancelado
create type po_status as enum ('DRAFT','SENT','PARTIAL','RECEIVED','CANCELLED');

CREATE TYPE afect_igv_type AS ENUM ('10', '20');
--10: OPERACIONES GRAVADAS, LAS CUALES SI TIENEN IGV
--20: OPERACIONES EXONERADAS, SIN IGV

CREATE TYPE currency_type  AS ENUM ('PEN', 'USD');
--PEN: SOLES
--USD: DOLARES


CREATE TYPE pay_doc_type AS ENUM ('PURCHASE', 'SALE');
--SE DEFINE SI EL DOCUMENTO ES COMPRA O VENTA

CREATE TYPE payment_form_type AS ENUM ('CONTADO', 'CREDITO');
--SE DEFINE SI ES A CONTADO O A CREDITO LOS PAGOS DE LA VENTA O COMPRA

--TIPOS DE PAGO


CREATE TYPE voucher_doc_type AS ENUM ('01', '03', '07', '08');
--01: FACTURA
--03: BOLETA
--07: NOTA DE CREDITO
--08: NOTA DE DEBITO

-- ---------------------------------------------------------
-- TABLA: purchase_orders
-- Para que sirve:
-- - Orden de compra (cabecera) para reponer stock.
-- Que información guarda:
-- - proveedor, almacen destino, estado, fecha esperada, nota.
-- Columnas (ES):
-- - po_id: id orden compra
-- - supplier_id: proveedor
-- - warehouse_id: almacen que recibira
-- - status: estado de la OC
-- - expected_at: fecha esperada (di­a)
-- - note: observación
-- - created_at: fecha creación
-- ---------------------------------------------------------
create table purchase_orders (
  po_id uuid primary key default uuid_generate_v4(),
  supplier_id uuid not null references suppliers(supplier_id),
  warehouse_id uuid not null references warehouses(warehouse_id),
  document_type voucher_doc_type,
  serie varchar,
  correlative int,

  currency currency_type,
  payment_form payment_form_type,
  credit_days int NOT NULL DEFAULT 0,
  num_quotas int NOT NULL DEFAULT 0,

  total_taxed numeric(12, 2) NOT NULL DEFAULT 0,
  total_exempted numeric(12, 2) NOT NULL DEFAULT 0,
  total_igv numeric(12, 2) NOT NULL DEFAULT 0,
  purchase_value numeric(12, 2) NOT NULL DEFAULT 0,
  total numeric(12, 2),

  note text,

  status public.po_status NOT NULL DEFAULT 'DRAFT',
  expected_at date,
  date_issue date,
  date_expiration date,
  is_active boolean NOT NULL DEFAULT true,

  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (po_id)
  constraint uq_po_doc unique (document_type, serie, correlative)
);
-- ---------------------------------------------------------
-- TABLA: purchase_order_items
-- Para que sirve:
-- - Detalle de la orden de compra (que SKU y que cantidad se compra).
-- Que información guarda:
-- - SKU, cantidad, costo.
-- Columnas (ES):
-- - po_item_id: id detalle
-- - po_id: orden compra padre
-- - stock_item_id: item de stock comprado
-- - quantity: cantidad
-- - unit_cost: costo unitario
-- ---------------------------------------------------------
CREATE TABLE "public"."purchase_order_items" (
  "po_item_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "po_id" uuid NOT NULL REFERENCES purchase_orders(po_id),
  "stock_item_id" uuid NOT NULL REFERENCES stock_items(stock_item_id),
  "equivalence" varchar,
  "unit_base" varchar,
  "factor" int,

  "afect_type" afect_igv_type,

  "quantity" int NOT NULL,
  "porcentage_igv" numeric,
  "base_without_igv" numeric(12, 2),
  "amount_igv" numeric(12, 2),

  "unit_value" numeric(12, 2),
  "unit_price" numeric(12, 2) NOT NULL,
  "purchase_value" numeric(12, 2),

  PRIMARY KEY ("po_item_id"),
  CHECK ("quantity" > 0)
  CHECK ("porcentage_igv" >= 0)
  CHECK ("base_without_igv" >= 0)
  CHECK ("amount_igv" >= 0)
  CHECK ("unit_value" >= 0)
  CHECK ("unit_price" >= 0)
);

-- =========================
-- NUEVAS TABLAS -- PAYMENTS
-- =========================


create table public.credit_quotas (
  quota_id uuid primary key default uuid_generate_v4(),
  number int not null check (number >= 1),
  expiration_date date not null,
  payment_date timestamptz,
  total_to_pay numeric(12,2) not null check (total_to_pay > 0),
  total_paid numeric(12,2) not null default 0 check (total_paid >= 0 and total_paid <= total_to_pay),
  from_document_type pay_doc_type not null,
  po_id uuid null references public.purchase_orders(po_id),
  created_at timestamptz not null default now()
);

CREATE TABLE public.payment_documents (
  pay_doc_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  method varchar(300) NOT NULL,
  date timestamptz NOT NULL,
  operation_number varchar(60),
  currency currency_type NOT NULL,
  amount numeric(12, 2) NOT NULL,
  note varchar(225),
  from_document_type pay_doc_type NOT NULL,
  po_id uuid NULL REFERENCES public.purchase_orders(po_id),
  quota_id uuid NULL REFERENCES public.credit_quotas(quota_id),
  PRIMARY KEY (pay_doc_id),
  check (amount > 0)
);
create index idx_payment_documents_po on public.payment_documents(po_id);
create index idx_payment_documents_quota on public.payment_documents(quota_id);
create index idx_credit_quotas_po on public.credit_quotas(po_id);

-- =========================
-- 8) Producción
-- =========================

-- Estados de orden de producción:
-- DRAFT: borrador
-- IN_PROGRESS: en producción
-- COMPLETED: finalizada
-- CANCELLED: cancelada
create type production_status as enum ('DRAFT','IN_PROGRESS','COMPLETED','CANCELLED');

-- Tipo de documento para producción
create type doc_type as enum ('IN','OUT','TRANSFER','ADJUSTMENT','PRODUCTION');

-- ---------------------------------------------------------
-- TABLA: production_orders
-- Para que sirve:
-- - Cabecera de órdenes de producción.
-- Que información guarda:
-- - Almacen origen/destino, serie, correlativo, estado y auditori­a.
-- Columnas (ES):
-- - production_id: id de orden producción
-- - from_warehouse_id: almacen origen
-- - to_warehouse_id: almacen destino
-- - doc_type: tipo de documento
-- - serie_id: serie documental asociada
-- - correlative: correlativo de la orden
-- - status: estado de la orden
-- - reference: referencia externa/interna
-- - manufacture_date: fecha de fabricación
-- - created_by: usuario creador (texto)
-- - updated_by: usuario que actualizó (texto, opcional)
-- - created_at: fecha creación
-- - updated_at: fecha actualización
-- ---------------------------------------------------------
create table production_orders (
  production_id uuid primary key default uuid_generate_v4(),
  from_warehouse_id uuid not null references warehouses(warehouse_id),
  to_warehouse_id uuid not null references warehouses(warehouse_id),
  doc_type doc_type not null default 'PRODUCTION',
  serie_id uuid not null references documents_series(series_id),
  correlative int not null,
  status production_status not null default 'DRAFT',
  reference varchar not null,
  manufacture_date timestamptz not null,
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
-- Para que sirve:
-- - Detalle de la orden de producción.
-- Que información guarda:
-- - Item final a fabricar, ubicación origen/destino, cantidad y costo unitario.
-- Columnas (ES):
-- - item_id: id del item
-- - production_id: orden producción padre
-- - finished_item_id: item final (stock_item)
-- - from_location_id: ubicación origen
-- - to_location_id: ubicación destino
-- - quantity: cantidad
-- - unit_cost: costo unitario
-- ---------------------------------------------------------
create table production_order_items (
  item_id uuid primary key default uuid_generate_v4(),
  production_id uuid not null references production_orders(production_id) on delete cascade,
  finished_item_id uuid not null references stock_items(stock_item_id),
  from_location_id uuid  null references warehouse_locations(location_id),
  to_location_id uuid  null references warehouse_locations(location_id),
  quantity int not null check (quantity > 0),
  waste_qty numeric(12,6) not null default 0,
  unit_cost numeric not null,
  check (waste_qty >= 0),
  check (waste_qty <= quantity)
);

create index idx_production_items_production on production_order_items(production_id);
create index idx_production_items_finished_item on production_order_items(finished_item_id);

-- ---------------------------------------------------------
-- TABLA: security_reason_catalog
-- Para que sirve:
-- - Catalogo de motivos tecnicos de seguridad (reason key -> label).
-- Que informacion guarda:
-- - Clave tecnica estable para filtros, etiqueta visible y estado activo.
-- ---------------------------------------------------------
create table if not exists security_reason_catalog (
  id uuid primary key default uuid_generate_v4(),
  key varchar(120) not null unique,
  label varchar(180) not null,
  description varchar(500),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into security_reason_catalog (key, label, description, active)
values
  ('rate_limit_exceeded', 'Rate Limit Exceeded', 'Limite de requests excedido por throttling', true),
  ('temporary_ban_request', 'Temporary Ban Request', 'Solicitud de baneo temporal por reincidencia', true),
  ('manual_permanent_ban_request', 'Manual Permanent Ban Request', 'Intento de acceso mientras la IP esta en blacklist permanente', true),
  ('manual_permanent_ban', 'Manual Permanent Ban', 'Bloqueo permanente aplicado manualmente', true),
  ('manual_unban', 'Manual Unban', 'Retiro manual de blacklist permanente', true)
on conflict (key) do nothing;

-- =========================
-- Product Catalog V2
-- =========================

create table if not exists pc_products (
  product_id uuid primary key default uuid_generate_v4(),
  name varchar(180) not null unique,
  description text,
  category varchar(120),
  brand varchar(120),
  base_unit_id uuid references units(unit_id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pc_skus (
  sku_id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references pc_products(product_id) on delete cascade,
  backend_sku varchar(80) not null unique,
  custom_sku varchar(80) unique,
  name varchar(180) not null,
  barcode varchar(80) unique,
  price numeric(12,2) not null default 0,
  cost numeric(12,2) not null default 0,
  is_sellable boolean not null default true,
  is_purchasable boolean not null default false,
  is_manufacturable boolean not null default false,
  is_stock_tracked boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_pc_skus_product on pc_skus(product_id);

create table if not exists supplier_skus (
  supplier_id uuid not null references suppliers(supplier_id) on delete cascade,
  sku_id uuid not null references pc_skus(sku_id) on delete cascade,
  supplier_sku varchar(80),
  last_cost numeric(12,2),
  lead_time_days int,
  primary key (supplier_id, sku_id)
);

create table if not exists pc_attributes (
  attribute_id uuid primary key default uuid_generate_v4(),
  code varchar(80) not null unique,
  name varchar(120) not null
);

create table if not exists pc_sku_attribute_values (
  sku_attribute_value_id uuid primary key default uuid_generate_v4(),
  sku_id uuid not null references pc_skus(sku_id) on delete cascade,
  attribute_id uuid not null references pc_attributes(attribute_id) on delete cascade,
  value varchar(255) not null,
  constraint ux_pc_sku_attribute_values unique (sku_id, attribute_id)
);

create table if not exists pc_recipes (
  recipe_id uuid primary key default uuid_generate_v4(),
  sku_id uuid not null references pc_skus(sku_id) on delete cascade,
  version int not null default 1,
  yield_quantity numeric(12,3) not null,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_pc_recipes_sku on pc_recipes(sku_id);

create table if not exists pc_recipe_items (
  recipe_item_id uuid primary key default uuid_generate_v4(),
  recipe_id uuid not null references pc_recipes(recipe_id) on delete cascade,
  material_sku_id uuid not null references pc_skus(sku_id),
  quantity numeric(12,3) not null,
  unit_id uuid not null references units(unit_id)
);

create table if not exists pc_catalog_publications (
  publication_id uuid primary key default uuid_generate_v4(),
  channel_code varchar(80) not null,
  sku_id uuid not null references pc_skus(sku_id) on delete cascade,
  is_visible boolean not null default true,
  sort_order int not null default 0,
  price_override numeric(12,2),
  display_name_override varchar(255),
  created_at timestamptz not null default now(),
  constraint ux_pc_catalog_publications unique (channel_code, sku_id)
);
create index if not exists idx_pc_catalog_publications_channel on pc_catalog_publications(channel_code);

create table if not exists pc_stock_items (
  stock_item_id uuid primary key default uuid_generate_v4(),
  sku_id uuid not null unique references pc_skus(sku_id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists pc_inventory (
  warehouse_id uuid not null references warehouses(warehouse_id),
  stock_item_id uuid not null references pc_stock_items(stock_item_id) on delete cascade,
  location_id uuid references warehouse_locations(location_id),
  on_hand int not null default 0,
  reserved int not null default 0,
  available int,
  updated_at timestamptz not null default now(),
  primary key (warehouse_id, stock_item_id)
);

create table if not exists pc_inventory_documents (
  doc_id uuid primary key default uuid_generate_v4(),
  doc_type inv_doc_type not null,
  status inv_doc_status not null default 'DRAFT',
  serie_id uuid,
  correlative int,
  from_warehouse_id uuid references warehouses(warehouse_id),
  to_warehouse_id uuid references warehouses(warehouse_id),
  reference_id uuid,
  reference_type varchar,
  note text,
  created_by uuid,
  posted_by uuid,
  posted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists pc_inventory_document_items (
  item_id uuid primary key default uuid_generate_v4(),
  doc_id uuid not null references pc_inventory_documents(doc_id) on delete cascade,
  stock_item_id uuid not null references pc_stock_items(stock_item_id) on delete cascade,
  from_location_id uuid references warehouse_locations(location_id),
  to_location_id uuid references warehouse_locations(location_id),
  quantity int not null,
  waste_qty numeric(12,6) not null default 0,
  unit_cost numeric(12,2)
);
create index if not exists idx_pc_inv_doc_items_doc on pc_inventory_document_items(doc_id);
create index if not exists idx_pc_inv_doc_items_stock_item on pc_inventory_document_items(stock_item_id);

create table if not exists pc_inventory_ledger (
  ledger_id uuid primary key default uuid_generate_v4(),
  doc_id uuid not null references pc_inventory_documents(doc_id),
  doc_item_id uuid references pc_inventory_document_items(item_id),
  warehouse_id uuid not null references warehouses(warehouse_id),
  location_id uuid references warehouse_locations(location_id),
  stock_item_id uuid not null references pc_stock_items(stock_item_id) on delete cascade,
  direction inv_direction not null,
  quantity int not null,
  waste_qty numeric(12,6) not null default 0,
  unit_cost numeric(12,2),
  created_at timestamptz not null default now()
);
