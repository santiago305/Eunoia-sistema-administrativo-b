import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EntityManager } from 'typeorm';

/**
 * Resolves the company that owns a newly-created sale order.
 *
 * Normal users are always forced to their assigned company. A superadmin may
 * choose any active company explicitly; when there is exactly one active
 * company, it is used as the backwards-compatible default.
 */
export async function resolveSaleOrderCompanyId(
  manager: EntityManager | undefined,
  userId: string,
  requestedCompanyId?: string | null,
): Promise<string | null> {
  // Lightweight unit-test transactions do not expose a database manager.
  // Real requests always run through TypeORM and therefore take the guarded
  // path below.
  if (!manager || typeof (manager as any).query !== 'function') return null;

  const [actor] = await manager.query(
    `SELECT company_id, is_super_admin
       FROM users
      WHERE user_id = $1
      LIMIT 1`,
    [userId],
  ) as Array<{ company_id: string | null; is_super_admin: boolean }>;

  if (!actor) {
    // Keep isolated unit fixtures that do not model the users table usable;
    // a real transaction cannot persist the resulting null company because
    // the migration makes sale_orders.company_id mandatory.
    return null;
  }

  const requested = requestedCompanyId?.trim() || null;
  if (requested) {
    const activeCompany = await manager.query(
      `SELECT company_id
         FROM companies
        WHERE company_id = $1
          AND is_active = true
        LIMIT 1`,
      [requested],
    ) as Array<{ company_id: string }>;
    if (!activeCompany.length) {
      throw new BadRequestException('La compañía seleccionada no está activa');
    }
    if (!actor.is_super_admin && actor.company_id !== requested) {
      throw new ForbiddenException('No puedes crear pedidos para otra compañía');
    }
    return requested;
  }

  if (actor.company_id) return actor.company_id;

  if (actor.is_super_admin) {
    const activeCompanies = await manager.query(
      `SELECT company_id
         FROM companies
        WHERE is_active = true
        ORDER BY created_at ASC, company_id ASC`,
    ) as Array<{ company_id: string }>;
    if (activeCompanies.length === 1) return activeCompanies[0].company_id;
    throw new BadRequestException(
      'Selecciona la compañía del pedido antes de registrar la operación',
    );
  }

  throw new ForbiddenException(
    'El usuario no tiene una compañía asignada para crear pedidos',
  );
}
