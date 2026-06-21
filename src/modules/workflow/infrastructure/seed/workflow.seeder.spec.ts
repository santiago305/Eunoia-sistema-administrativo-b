import { ABONADO_WORKFLOW_SEEDS } from './abonado-workflows.seed-data';
import { materializeWorkflowSeed } from './workflow.seeder';

describe('ABONADO workflow seed definitions', () => {
  it('defines both complete workflows with locally resolvable references', () => {
    expect(ABONADO_WORKFLOW_SEEDS.map(({ name }) => name)).toEqual([
      'ABONADO ENVIO',
      'ABONADO CE',
    ]);

    for (const workflow of ABONADO_WORKFLOW_SEEDS) {
      const stateRefs = new Set(workflow.states.map(({ clientId }) => clientId));
      expect(workflow.states.filter(({ isInitial }) => isInitial)).toHaveLength(1);
      expect(new Set(workflow.transitions.map(({ code }) => code)).size).toBe(
        workflow.transitions.length,
      );

      for (const transition of workflow.transitions) {
        for (const ref of [
          transition.fromStateRef,
          transition.toStateRef,
          transition.elseToStateRef,
          ...transition.excludedStateRefs,
        ].filter(Boolean)) {
          expect(stateRefs.has(ref as string)).toBe(true);
        }
      }
    }
  });
});

describe('materializeWorkflowSeed', () => {
  it('creates stable workflow-scoped ids and resolves every state reference', () => {
    const envio = materializeWorkflowSeed(ABONADO_WORKFLOW_SEEDS[0]);
    const ce = materializeWorkflowSeed(ABONADO_WORKFLOW_SEEDS[1]);

    expect(envio.states[0].id).not.toBe(ce.states[0].id);
    expect(materializeWorkflowSeed(ABONADO_WORKFLOW_SEEDS[0])).toEqual(envio);

    const stateIds = new Set(envio.states.map(({ id }) => id));
    for (const transition of envio.transitions) {
      for (const id of [transition.fromStateId, transition.toStateId, transition.elseToStateId].filter(Boolean)) {
        expect(stateIds.has(id as string)).toBe(true);
      }
      expect(transition.excludedStateIds.every((id) => stateIds.has(id))).toBe(true);
    }
  });
});
