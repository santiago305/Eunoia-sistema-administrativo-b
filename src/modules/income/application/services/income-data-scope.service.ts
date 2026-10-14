import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { AccessControlService } from "src/modules/access-control/application/services/access-control.service";

export interface IncomeDataScope {
  /** null means no per-user restriction; companyId may still constrain the data. */
  userId: string | null;
  /** null/undefined is reserved for the explicit system-wide wildcard permission. */
  companyId?: string | null;
  subsidiaryIds?: string[];
  accountIds?: string[];
  clientIds?: string[];
}

export type IncomeScopeAssignment = { type: "SUBSIDIARY" | "PAYMENT_ACCOUNT" | "CLIENT"; id: string };

@Injectable()
export class IncomeDataScopeService {
  constructor(
    private readonly accessControl: AccessControlService,
    private readonly dataSource: DataSource,
  ) {}

  async resolve(userId: string): Promise<IncomeDataScope> {
    const permissions = new Set(await this.accessControl.getEffectivePermissions(userId));
    if (permissions.has("*")) return { userId: null, companyId: null, subsidiaryIds: [], accountIds: [], clientIds: [] };
    if (!permissions.has("income.view_all") && !permissions.has("income.view_own")) {
      throw new ForbiddenException("No tienes permiso para consultar ingresos");
    }
    const users: Array<{ company_id: string | null }> = await this.dataSource.query(
      `SELECT company_id FROM users WHERE user_id = $1`, [userId],
    );
    const companyId = users[0]?.company_id;
    if (!companyId) throw new ForbiddenException("El usuario no tiene una empresa asignada para consultar ingresos");
    if (permissions.has("income.view_all")) {
      const accounts: Array<{ company_payment_account_id: string }> = await this.dataSource.query(
        `SELECT company_payment_account_id FROM company_payment_accounts WHERE company_id = $1`, [companyId],
      );
      return { userId: null, companyId, subsidiaryIds: [], accountIds: accounts.map((x) => x.company_payment_account_id), clientIds: [] };
    }
    if (permissions.has("income.view_own")) {
      const assignments: Array<{ scope_type: IncomeScopeAssignment["type"]; scope_id: string }> = await this.dataSource.query(
        `SELECT scope_type, scope_id FROM user_financial_data_scopes WHERE user_id = $1`, [userId],
      );
      return {
        userId,
        companyId,
        subsidiaryIds: assignments.filter((x) => x.scope_type === "SUBSIDIARY").map((x) => x.scope_id),
        accountIds: assignments.filter((x) => x.scope_type === "PAYMENT_ACCOUNT").map((x) => x.scope_id),
        clientIds: assignments.filter((x) => x.scope_type === "CLIENT").map((x) => x.scope_id),
      };
    }
    throw new ForbiddenException("No tienes permiso para consultar ingresos");
  }

  async listAssignments(userId: string, actorUserId?: string): Promise<IncomeScopeAssignment[]> {
    if (actorUserId && actorUserId !== userId) {
      const actorPermissions = await this.accessControl.getEffectivePermissions(actorUserId);
      if (!actorPermissions.includes("*")) {
        const [actorCompanyId, targetCompanyId] = await Promise.all([
          this.getUserCompanyId(actorUserId),
          this.getUserCompanyId(userId),
        ]);
        if (!actorCompanyId || actorCompanyId !== targetCompanyId) throw new NotFoundException("Usuario no encontrado");
      }
    }
    const rows: Array<{ scope_type: IncomeScopeAssignment["type"]; scope_id: string }> = await this.dataSource.query(
      `SELECT scope_type, scope_id FROM user_financial_data_scopes WHERE user_id = $1 ORDER BY scope_type, scope_id`, [userId],
    );
    return rows.map((row) => ({ type: row.scope_type, id: row.scope_id }));
  }

  async listAssignmentOptions(actorUserId: string) {
    const actorPermissions = await this.accessControl.getEffectivePermissions(actorUserId);
    const actorCompanyId = actorPermissions.includes("*") ? null : await this.getUserCompanyId(actorUserId);
    if (!actorPermissions.includes("*") && !actorCompanyId) throw new ForbiddenException("El usuario no tiene una empresa asignada");
    const [subsidiaries, clients, accounts] = await Promise.all([
      this.dataSource.query(`SELECT id, alias AS label FROM subsidiaries WHERE is_active = true ORDER BY alias`),
      this.dataSource.query(`SELECT id, full_name AS label FROM clients WHERE is_active = true ORDER BY full_name LIMIT 500`),
      actorCompanyId
        ? this.dataSource.query(`SELECT company_payment_account_id AS id, COALESCE(masked_label, name) AS label
          FROM company_payment_accounts WHERE is_active = true AND company_id = $1 ORDER BY name`, [actorCompanyId])
        : this.dataSource.query(`SELECT company_payment_account_id AS id, COALESCE(masked_label, name) AS label
          FROM company_payment_accounts WHERE is_active = true ORDER BY name`),
    ]);
    return { subsidiaries, clients, paymentAccounts: accounts };
  }

  async assertCanReadAccount(accountId: string, scope: IncomeDataScope): Promise<void> {
    if (this.isUnrestricted(scope)) return;
    if (scope.accountIds !== undefined) {
      if (!scope.accountIds.includes(accountId)) throw new NotFoundException("Cuenta no encontrada");
      return;
    }
    if (!scope.companyId) throw new NotFoundException("Cuenta no encontrada");
    const rows = await this.dataSource.query(
      `SELECT company_payment_account_id FROM company_payment_accounts WHERE company_payment_account_id = $1 AND company_id = $2`,
      [accountId, scope.companyId],
    );
    if (!rows.length) throw new NotFoundException("Cuenta no encontrada");
  }

  async assertCanReadStatementLine(lineId: string, scope: IncomeDataScope): Promise<void> {
    if (this.isUnrestricted(scope)) return;
    const rows: Array<{ company_payment_account_id: string }> = await this.dataSource.query(
      `SELECT company_payment_account_id FROM bank_statement_lines WHERE id = $1`, [lineId],
    );
    if (!rows.length) throw new NotFoundException("Línea bancaria no encontrada");
    await this.assertCanReadAccount(rows[0].company_payment_account_id, scope);
  }

  async replaceAssignments(targetUserId: string, actorUserId: string, assignments: IncomeScopeAssignment[]) {
    if (!Array.isArray(assignments) || assignments.length > 1000) throw new ForbiddenException("La lista de alcances no es válida");
    const normalized = [...new Map(assignments.map((item) => [`${item?.type}:${item?.id}`, item])).values()];
    const invalid = normalized.filter((item) => !item || !["SUBSIDIARY", "PAYMENT_ACCOUNT", "CLIENT"].includes(item.type) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.id));
    if (invalid.length) throw new ForbiddenException("Uno o más alcances no son válidos");
    const target: Array<{ user_id: string; company_id: string | null }> = await this.dataSource.query(`SELECT user_id, company_id FROM users WHERE user_id = $1`, [targetUserId]);
    if (!target.length) throw new NotFoundException("Usuario no encontrado");
    if (!target[0].company_id) throw new NotFoundException("El usuario no tiene una empresa asignada");
    const actorPermissions = await this.accessControl.getEffectivePermissions(actorUserId);
    const actorCompanyId = actorPermissions.includes("*") ? null : await this.getUserCompanyId(actorUserId);
    if (!actorPermissions.includes("*") && actorCompanyId !== target[0].company_id) {
      throw new NotFoundException("Usuario no encontrado");
    }
    for (const type of ["SUBSIDIARY", "PAYMENT_ACCOUNT", "CLIENT"] as const) {
      const ids = normalized.filter((x) => x.type === type).map((x) => x.id);
      if (!ids.length) continue;
      const queries = {
        SUBSIDIARY: { sql: `SELECT id FROM subsidiaries WHERE id = ANY($1::uuid[]) AND is_active = true`, params: [ids] },
        CLIENT: { sql: `SELECT id FROM clients WHERE id = ANY($1::uuid[]) AND is_active = true`, params: [ids] },
        PAYMENT_ACCOUNT: { sql: `SELECT company_payment_account_id AS id FROM company_payment_accounts WHERE company_payment_account_id = ANY($1::uuid[]) AND is_active = true AND company_id = $2`, params: [ids, target[0].company_id] },
      };
      const found: Array<{ id: string }> = await this.dataSource.query(queries[type].sql, queries[type].params);
      if (found.length !== ids.length) throw new NotFoundException("Uno o más alcances no existen o están inactivos");
    }
    const before = await this.listAssignments(targetUserId);
    const after = normalized.sort((a, b) => a.type.localeCompare(b.type) || a.id.localeCompare(b.id));
    await this.dataSource.transaction(async (manager) => {
      await manager.query(`DELETE FROM user_financial_data_scopes WHERE user_id = $1`, [targetUserId]);
      for (const item of after) await manager.query(
        `INSERT INTO user_financial_data_scopes (user_id, scope_type, scope_id, created_by_user_id) VALUES ($1, $2, $3, $4)`,
        [targetUserId, item.type, item.id, actorUserId],
      );
      await manager.query(`INSERT INTO user_financial_data_scope_audits (target_user_id, actor_user_id, before_scopes, after_scopes)
        VALUES ($1, $2, $3::jsonb, $4::jsonb)`, [targetUserId, actorUserId, JSON.stringify(before), JSON.stringify(after)]);
    });
    return { userId: targetUserId, assignments: after };
  }

  private paymentAccessPredicate(scope: IncomeDataScope, startAt: number, orderAlias = "so", paymentAlias = "sp") {
    const params: unknown[] = [];
    const predicates: string[] = [];
    if (scope.companyId) {
      params.push(scope.companyId);
      predicates.push(`EXISTS (SELECT 1 FROM company_payment_accounts scope_account
        WHERE scope_account.company_payment_account_id = ${paymentAlias}.company_payment_account_id
          AND scope_account.company_id = $${startAt + params.length - 1})`);
    }
    if (scope.userId) {
      const userParam = `$${startAt + params.length}`;
      const alternatives = [`${orderAlias}.created_by = ${userParam}`, `${paymentAlias}.created_by_user_id = ${userParam}`, `${paymentAlias}.updated_by_user_id = ${userParam}`];
      params.push(scope.userId);
    const subsidiaries = scope.subsidiaryIds ?? [];
    const clients = scope.clientIds ?? [];
    const accounts = scope.accountIds ?? [];
    if (subsidiaries.length) { params.push(subsidiaries); alternatives.push(`${orderAlias}.agency_subsidiary_id = ANY($${startAt + params.length - 1}::uuid[])`); }
    if (clients.length) { params.push(clients); alternatives.push(`${orderAlias}.client_id = ANY($${startAt + params.length - 1}::uuid[])`); }
    if (accounts.length) { params.push(accounts); alternatives.push(`${paymentAlias}.company_payment_account_id = ANY($${startAt + params.length - 1}::uuid[])`); }
      predicates.push(`(${alternatives.join(" OR ")})`);
    }
    return { sql: predicates.length ? `(${predicates.join(" AND ")})` : "TRUE", params };
  }

  private orderAccessPredicate(scope: IncomeDataScope, startAt: number, orderAlias = "so", includePaymentAccess = true) {
    const params: unknown[] = [];
    const predicates: string[] = [];
    if (scope.companyId) {
      params.push(scope.companyId);
      predicates.push(`(EXISTS (SELECT 1 FROM company_payment_accounts scope_account
          JOIN sale_payments scope_payment ON scope_payment.company_payment_account_id = scope_account.company_payment_account_id
         WHERE scope_payment.sale_order_id = ${orderAlias}.id AND scope_account.company_id = $${startAt + params.length - 1})
        OR EXISTS (SELECT 1 FROM users scope_creator WHERE scope_creator.user_id = ${orderAlias}.created_by
          AND scope_creator.company_id = $${startAt + params.length - 1}))`);
    }
    if (scope.userId) {
    const userParam = `$${startAt + params.length}`;
    const alternatives = [`${orderAlias}.created_by = ${userParam}`];
    params.push(scope.userId);
    if ((scope.subsidiaryIds ?? []).length) { params.push(scope.subsidiaryIds); alternatives.push(`${orderAlias}.agency_subsidiary_id = ANY($${startAt + params.length - 1}::uuid[])`); }
    if ((scope.clientIds ?? []).length) { params.push(scope.clientIds); alternatives.push(`${orderAlias}.client_id = ANY($${startAt + params.length - 1}::uuid[])`); }
    if (includePaymentAccess) {
      const paymentAlternatives = [`sp.created_by_user_id = ${userParam}`, `sp.updated_by_user_id = ${userParam}`];
      if ((scope.accountIds ?? []).length) { params.push(scope.accountIds); paymentAlternatives.push(`sp.company_payment_account_id = ANY($${startAt + params.length - 1}::uuid[])`); }
      alternatives.push(`EXISTS (SELECT 1 FROM sale_payments sp WHERE sp.sale_order_id = ${orderAlias}.id AND (${paymentAlternatives.join(" OR ")}))`);
    }
      predicates.push(`(${alternatives.join(" OR ")})`);
    }
    return { sql: predicates.length ? `(${predicates.join(" AND ")})` : "TRUE", params };
  }

  private isUnrestricted(scope: IncomeDataScope): boolean {
    return scope.userId === null && !scope.companyId;
  }

  private async getUserCompanyId(userId: string): Promise<string | null> {
    const rows: Array<{ company_id: string | null }> = await this.dataSource.query(
      `SELECT company_id FROM users WHERE user_id = $1`, [userId],
    );
    return rows[0]?.company_id ?? null;
  }

  async assertCanReadIncome(incomeId: string, scope: IncomeDataScope): Promise<void> {
    return this.assertCanReadIncomes([incomeId], scope);
  }

  async assertCanReadIncomes(incomeIds: string[], scope: IncomeDataScope): Promise<void> {
    if (this.isUnrestricted(scope)) return;
    const ids = [...new Set(incomeIds.filter(Boolean))];
    if (!ids.length) return;
    const access = this.paymentAccessPredicate(scope, 2);
    const rows: Array<{ id: string }> = await this.dataSource.query(
      `SELECT sp.id
         FROM sale_payments sp
         JOIN sale_orders so ON so.id = sp.sale_order_id
        WHERE sp.id = ANY($1::uuid[])
          AND ${access.sql}
        GROUP BY sp.id`,
      [ids, ...access.params],
    );
    if (rows.length !== ids.length) throw new NotFoundException("Ingreso no encontrado");
  }

  async assertCanReadSaleOrder(saleOrderId: string, scope: IncomeDataScope): Promise<void> {
    if (this.isUnrestricted(scope)) return;
    const access = this.orderAccessPredicate(scope, 2);
    const rows = await this.dataSource.query(
      `SELECT so.id FROM sale_orders so
        WHERE so.id = $1
          AND ${access.sql}
        LIMIT 1`,
      [saleOrderId, ...access.params],
    );
    if (!rows.length) throw new NotFoundException("Pedido no encontrado");
  }

  async assertCanReadClient(clientId: string, scope: IncomeDataScope): Promise<void> {
    if (this.isUnrestricted(scope)) return;
    const access = this.paymentAccessPredicate(scope, 2);
    const rows = await this.dataSource.query(
      `SELECT sp.id FROM sale_payments sp
        JOIN sale_orders so ON so.id = sp.sale_order_id
        WHERE so.client_id = $1
          AND ${access.sql}
        LIMIT 1`,
      [clientId, ...access.params],
    );
    if (!rows.length) throw new NotFoundException("Cliente no encontrado");
  }

  async listReadableIncomeIdsForClient(clientId: string, scope: IncomeDataScope): Promise<string[] | null> {
    if (this.isUnrestricted(scope)) return null;
    const access = this.paymentAccessPredicate(scope, 2);
    const rows: Array<{ id: string }> = await this.dataSource.query(
      `SELECT sp.id
         FROM sale_payments sp
         JOIN sale_orders so ON so.id = sp.sale_order_id
        WHERE so.client_id = $1 AND ${access.sql}
        ORDER BY sp.id`,
      [clientId, ...access.params],
    );
    return rows.map((row) => row.id);
  }

  async listReadableSaleOrderIdsForIncome(incomeId: string, scope: IncomeDataScope): Promise<string[] | null> {
    if (this.isUnrestricted(scope)) return null;
    // Candidate orders expose their full payment availability; require an order-wide
    // assignment instead of a single visible payment on that target.
    const access = this.orderAccessPredicate(scope, 2, "target", false);
    const rows: Array<{ id: string }> = await this.dataSource.query(
      `SELECT target.id
         FROM sale_payments source_payment
         JOIN sale_orders source ON source.id = source_payment.sale_order_id
         JOIN sale_orders target ON target.client_id = source.client_id
        WHERE source_payment.id = $1
          AND target.id <> source.id
          AND ${access.sql}
        ORDER BY target.id`,
      [incomeId, ...access.params],
    );
    return rows.map((row) => row.id);
  }

  async assertCanReadRefund(refundId: string, scope: IncomeDataScope): Promise<void> {
    if (this.isUnrestricted(scope)) return;
    const access = this.paymentAccessPredicate(scope, 2);
    const rows = await this.dataSource.query(
      `SELECT refund.id FROM customer_refunds refund
         JOIN sale_payments sp ON sp.id = refund.sale_payment_id
         JOIN sale_orders so ON so.id = sp.sale_order_id
        WHERE refund.id = $1
          AND ${access.sql}
        LIMIT 1`,
      [refundId, ...access.params],
    );
    if (!rows.length) throw new NotFoundException("Reembolso no encontrado");
  }
}
