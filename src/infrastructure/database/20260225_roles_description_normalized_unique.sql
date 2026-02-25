-- Refuerzo de integridad para roles:
-- evita duplicados semanticos por mayusculas/minusculas y espacios laterales.
--
-- Antes de ejecutar en una BD existente, verificar si hay conflictos:
-- select lower(btrim(description)) as normalized_description, count(*)
-- from roles
-- group by lower(btrim(description))
-- having count(*) > 1;
--
-- Si existen filas duplicadas semanticas, normalizarlas/eliminarlas antes
-- de crear el indice unico.

create unique index if not exists ux_roles_description_normalized
  on roles (lower(btrim(description)));
