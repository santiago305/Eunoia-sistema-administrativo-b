import { databaseMigrations } from '../typeorm.config';
import { CreateWorkflowActionExecutions20260923090000 } from './20260923090000-create-workflow-action-executions';

describe('CreateWorkflowActionExecutions20260923090000', () => {
  it('is registered and creates the idempotent execution log', async () => {
    const queries: string[] = [];
    const queryRunner = { query: jest.fn(async (sql: string) => queries.push(sql)) };

    expect(databaseMigrations).toContain(CreateWorkflowActionExecutions20260923090000);
    await new CreateWorkflowActionExecutions20260923090000().up(queryRunner as never);

    const sql = queries.join('\n');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS workflow_action_executions');
    expect(sql).toContain('UNIQUE (idempotency_key)');
    expect(sql).toContain("'STARTED', 'COMPLETED', 'FAILED', 'SKIPPED'");
    expect(sql).toContain('idx_workflow_action_executions_sale_order');
  });

  it('removes indexes and table on rollback', async () => {
    const queries: string[] = [];
    const queryRunner = { query: jest.fn(async (sql: string) => queries.push(sql)) };

    await new CreateWorkflowActionExecutions20260923090000().down(queryRunner as never);

    expect(queries.join('\n')).toContain('DROP TABLE IF EXISTS workflow_action_executions');
  });
});
