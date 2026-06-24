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

  it('keeps ABONADO ENVIO aligned with the seeded automatic delivery path', () => {
    const envio = ABONADO_WORKFLOW_SEEDS.find(({ name }) => name === 'ABONADO ENVIO');

    expect(envio).toBeDefined();
    expect(envio?.states).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          clientId: 'state-51db9539-a81c-5dab-93a9-0ecd49a28c23',
          positionX: -245.75334571140957,
          positionY: 46.33580887812987,
          isFinal: true,
        }),
        expect.objectContaining({
          clientId: 'state-35e95b95-3687-5caa-8bcd-fb27f1a193ee',
          positionX: -565.6874645370526,
          positionY: 51.421371502229064,
        }),
      ]),
    );

    expect(envio?.transitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          clientId: 'transition-066ebc76-9b33-4636-b61b-a757568cf3a4',
          code: 'TRANSITION_1782332299577',
          name: 'Esperando',
          fromStateRef: 'state-805b9bd3-5efb-51a4-a93e-1c06ea49357a',
          toStateRef: 'state-35e95b95-3687-5caa-8bcd-fb27f1a193ee',
        }),
        expect.objectContaining({
          clientId: 'transition-140b19ac-050e-4457-828e-ca70d2c8a1ea',
          code: 'TRANSITION_1782332323009',
          name: 'Entregado',
          fromStateRef: 'state-35e95b95-3687-5caa-8bcd-fb27f1a193ee',
          toStateRef: 'state-51db9539-a81c-5dab-93a9-0ecd49a28c23',
          actions: [
            {
              type: 'CONSUME_STOCK',
              config: {},
              position: 0,
            },
          ],
        }),
      ]),
    );
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
