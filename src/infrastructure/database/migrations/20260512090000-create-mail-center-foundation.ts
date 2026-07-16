import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMailCenterFoundation20260512090000 implements MigrationInterface {
  name = "CreateMailCenterFoundation20260512090000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
-- Fase 2 (backend): estructura base para centro de mail/notificaciones tipo Gmail
-- Fecha: 2026-05-12

-- 1) Extensiones de messages / threads (compatibles con tabla existente)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS last_autosaved_at timestamp NULL,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamp NULL;

ALTER TABLE message_threads
  ADD COLUMN IF NOT EXISTS origin_module varchar(60) NULL,
  ADD COLUMN IF NOT EXISTS source_entity_type varchar(80) NULL,
  ADD COLUMN IF NOT EXISTS source_entity_id uuid NULL;

-- 2) Estado por usuario (pieza central)
CREATE TABLE IF NOT EXISTS message_user_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  thread_id uuid NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  relation_type varchar(20) NOT NULL,
  recipient_email varchar(255) NULL,
  is_in_inbox boolean NOT NULL DEFAULT false,
  is_in_sent boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  is_muted boolean NOT NULL DEFAULT false,
  read_at timestamp NULL,
  starred_at timestamp NULL,
  snoozed_until timestamp NULL,
  snoozed_at timestamp NULL,
  deleted_at timestamp NULL,
  trash_expires_at timestamp NULL,
  permanently_hidden_at timestamp NULL,
  delivered_at timestamp NULL,
  opened_at timestamp NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_message_user_states_message_user UNIQUE (message_id, user_id)
);

-- 3) Adjuntos
CREATE TABLE IF NOT EXISTS message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NULL REFERENCES messages(id) ON DELETE CASCADE,
  draft_id uuid NULL REFERENCES messages(id) ON DELETE CASCADE,
  original_name varchar(255) NOT NULL,
  stored_name varchar(255) NOT NULL,
  mime_type varchar(120) NOT NULL,
  size_bytes bigint NOT NULL,
  storage_key varchar(500) NOT NULL,
  uploaded_by_user_id uuid NOT NULL REFERENCES users(user_id),
  created_at timestamp NOT NULL DEFAULT now()
);

-- 4) Etiquetas
CREATE TABLE IF NOT EXISTS message_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NULL REFERENCES users(user_id) ON DELETE CASCADE,
  key varchar(100) NOT NULL,
  name varchar(120) NOT NULL,
  type varchar(20) NOT NULL,
  color varchar(30) NULL,
  icon varchar(80) NULL,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_message_labels_owner_key UNIQUE (owner_user_id, key)
);

CREATE TABLE IF NOT EXISTS message_label_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_id uuid NOT NULL REFERENCES message_labels(id) ON DELETE CASCADE,
  message_user_state_id uuid NOT NULL REFERENCES message_user_states(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_message_label_assignments_unique UNIQUE (label_id, message_user_state_id)
);

-- 5) Historial de busquedas (max 10 por usuario se aplicara en capa app/job)
CREATE TABLE IF NOT EXISTS message_search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  query varchar(255) NOT NULL,
  used_count integer NOT NULL DEFAULT 1,
  last_used_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_message_search_history_user_query UNIQUE (user_id, query)
);

-- 6) Auditoria
CREATE TABLE IF NOT EXISTS message_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NULL REFERENCES messages(id) ON DELETE SET NULL,
  thread_id uuid NULL REFERENCES message_threads(id) ON DELETE SET NULL,
  actor_user_id uuid NULL REFERENCES users(user_id) ON DELETE SET NULL,
  action varchar(80) NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

-- 7) Indices principales
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages (sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages (thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_origin_module ON messages (origin_module);
CREATE INDEX IF NOT EXISTS idx_messages_sender_user_id ON messages (sender_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages (status);

CREATE INDEX IF NOT EXISTS idx_message_user_states_inbox
  ON message_user_states (user_id, is_in_inbox, deleted_at, snoozed_until);
CREATE INDEX IF NOT EXISTS idx_message_user_states_sent
  ON message_user_states (user_id, is_in_sent);
CREATE INDEX IF NOT EXISTS idx_message_user_states_starred
  ON message_user_states (user_id, starred_at);
CREATE INDEX IF NOT EXISTS idx_message_user_states_trash
  ON message_user_states (user_id, deleted_at, trash_expires_at);
CREATE INDEX IF NOT EXISTS idx_message_user_states_snoozed
  ON message_user_states (user_id, snoozed_until);
CREATE INDEX IF NOT EXISTS idx_message_user_states_message_user
  ON message_user_states (message_id, user_id);

CREATE INDEX IF NOT EXISTS idx_message_labels_owner_user ON message_labels (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_message_labels_key ON message_labels (key);
CREATE INDEX IF NOT EXISTS idx_message_labels_type ON message_labels (type);

CREATE INDEX IF NOT EXISTS idx_message_label_assignments_user_label
  ON message_label_assignments (user_id, label_id);
CREATE INDEX IF NOT EXISTS idx_message_label_assignments_state
  ON message_label_assignments (message_user_state_id);

CREATE INDEX IF NOT EXISTS idx_message_search_history_user_last_used
  ON message_search_history (user_id, last_used_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_audit_logs_message_created
  ON message_audit_logs (message_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_audit_logs_thread_created
  ON message_audit_logs (thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_audit_logs_actor_created
  ON message_audit_logs (actor_user_id, created_at DESC);

-- 8) Full-text search base (subject + body_text)
CREATE INDEX IF NOT EXISTS idx_messages_fts_subject_body
  ON messages
  USING GIN (to_tsvector('simple', coalesce(subject, '') || ' ' || coalesce(body_text, '')));

-- 9) Labels de sistema iniciales (idempotente)
INSERT INTO message_labels (owner_user_id, key, name, type, color, icon, is_visible, sort_order)
VALUES
  (NULL, 'inbox', 'Recibidos', 'SYSTEM', NULL, 'Inbox', true, 10),
  (NULL, 'sent', 'Enviados', 'SYSTEM', NULL, 'Send', true, 20),
  (NULL, 'drafts', 'Borradores', 'SYSTEM', NULL, 'FileText', true, 30),
  (NULL, 'starred', 'Destacados', 'SYSTEM', NULL, 'Star', true, 40),
  (NULL, 'snoozed', 'Postergados', 'SYSTEM', NULL, 'Clock', true, 50),
  (NULL, 'archived', 'Archivados', 'SYSTEM', NULL, 'Archive', true, 60),
  (NULL, 'trash', 'Papelera', 'SYSTEM', NULL, 'Trash2', true, 70),
  (NULL, 'all', 'Todos', 'SYSTEM', NULL, 'List', true, 80)
ON CONFLICT (owner_user_id, key) DO NOTHING;

-- 10) Labels de modulo iniciales (idempotente)
INSERT INTO message_labels (owner_user_id, key, name, type, color, icon, is_visible, sort_order)
VALUES
  (NULL, 'purchases', 'Compras', 'MODULE', NULL, 'ShoppingCart', true, 100),
  (NULL, 'production', 'Produccion', 'MODULE', NULL, 'Factory', true, 110),
  (NULL, 'warehouse', 'Almacen', 'MODULE', NULL, 'Warehouse', true, 120),
  (NULL, 'catalog', 'Catalogo', 'MODULE', NULL, 'PackageSearch', true, 130),
  (NULL, 'supplies', 'Suministros', 'MODULE', NULL, 'Boxes', true, 140),
  (NULL, 'security', 'Seguridad', 'MODULE', NULL, 'Shield', true, 150),
  (NULL, 'roles', 'Roles', 'MODULE', NULL, 'Users', true, 160),
  (NULL, 'providers', 'Proveedores', 'MODULE', NULL, 'Truck', true, 170)
ON CONFLICT (owner_user_id, key) DO NOTHING;
`);
  }

  public async down(): Promise<void> {
    // Non-destructive by design.
  }
}