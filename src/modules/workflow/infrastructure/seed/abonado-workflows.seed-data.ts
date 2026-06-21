import { WorkflowActionType } from '../../domain/entities/workflow-action';
import { WorkflowConditionType } from '../../domain/entities/workflow-condition';
import { WorkflowTransitionEffect } from '../../domain/constants/workflow-transition-effect.constants';
import { WorkflowTransitionPurpose } from '../../domain/constants/workflow-transition-purpose.constants';

export type WorkflowActionSeed = { type: WorkflowActionType; config: Record<string, unknown>; position: number };
export type WorkflowConditionSeed = { type: WorkflowConditionType; config: Record<string, unknown>; position: number };
export type WorkflowStateSeed = { clientId: string; saleOrderStateId: string; position: number; positionX: number; positionY: number; isInitial: boolean; isFinal: boolean; isActive: boolean };
export type WorkflowTransitionSeed = {
  clientId: string; code: string; name: string; effect: WorkflowTransitionEffect;
  fromStateRef: string | null; toStateRef?: string | null; isGlobal: boolean;
  excludedStateRefs: string[]; purpose: WorkflowTransitionPurpose; sourceHandle: string | null;
  targetHandle: string | null; isActive: boolean; autoTrigger: boolean; priority: number;
  conditions: WorkflowConditionSeed[]; actions: WorkflowActionSeed[];
  elseEffect: WorkflowTransitionEffect | null; elseToStateRef: string | null; elseActions: WorkflowActionSeed[];
};
export type WorkflowSeed = { name: string; description: string | null; isActive: boolean; states: WorkflowStateSeed[]; transitions: WorkflowTransitionSeed[] };

const ref = (id: string) => `state-${id}`;
const action = (type: WorkflowActionType): WorkflowActionSeed => ({ type, config: {}, position: 0 });
const condition = (type: WorkflowConditionType, config: Record<string, unknown> = {}, position = 0): WorkflowConditionSeed => ({ type, config, position });

const CANCELLED = ref('8c612353-296e-48ad-b6dd-6ab63e6f7bd5');
const CREATED = ref('10327591-8e4b-4af4-8acf-5de9f7eb7a47');
const SCHEDULED = ref('07346cd7-b249-4b69-84d8-8c8d87fb4e4c');
const WAITING_STOCK = ref('d5d7fd37-ca75-44ac-98ab-e6a26fd98011');
const DELIVERED = ref('221cb320-29ab-428f-af77-e838678ce005');
const WAITING_PAYMENT = ref('9bf4bbe4-479a-440b-a290-5f0e11fa40dc');
const WAITING_CE = ref('bcfbb650-4ecd-4823-87e1-4b5cc9d24583');

const baseStates: WorkflowStateSeed[] = [
  { clientId: CANCELLED, saleOrderStateId: '21b5669b-fc3a-4bf2-9363-4b2d99c4c734', position: 0, positionX: -9999, positionY: -9999, isInitial: false, isFinal: false, isActive: true },
  { clientId: CREATED, saleOrderStateId: 'ae9b51d9-9324-4d15-a648-626a5eabda3d', position: 2, positionX: -562.7316284179688, positionY: -309.2750778198242, isInitial: true, isFinal: false, isActive: true },
  { clientId: SCHEDULED, saleOrderStateId: '2b2b266c-fee2-447d-9bb6-45d90f4d2cc2', position: 3, positionX: -562.5, positionY: -97.93066406249999, isInitial: false, isFinal: false, isActive: true },
  { clientId: WAITING_STOCK, saleOrderStateId: 'f779f1bd-4c20-4fd9-abe5-dfb065b4f1f3', position: 4, positionX: -288.75, positionY: -161.40418207480303, isInitial: false, isFinal: false, isActive: true },
  { clientId: DELIVERED, saleOrderStateId: 'b0ae3f76-f6cd-4f34-88b2-3d4c29aca53f', position: 5, positionX: -558.75, positionY: 105.8193359375, isInitial: false, isFinal: true, isActive: true },
];

const transition = (value: Partial<WorkflowTransitionSeed> & Pick<WorkflowTransitionSeed, 'clientId' | 'code' | 'name'>): WorkflowTransitionSeed => ({
  effect: 'MOVE_STATE', fromStateRef: null, toStateRef: null, isGlobal: false, excludedStateRefs: [], purpose: 'STANDARD',
  sourceHandle: null, targetHandle: null, isActive: true, autoTrigger: false, priority: 0, conditions: [], actions: [],
  elseEffect: null, elseToStateRef: null, elseActions: [], ...value,
});
const cancel = transition({ clientId: 'transition-75810215-f6aa-409d-9cd4-c21bea4ad803', code: 'CANCEL', name: 'Cancelar', toStateRef: CANCELLED, isGlobal: true, excludedStateRefs: [CANCELLED, DELIVERED], purpose: 'CANCEL', actions: [action('REVERT_STOCK')] });
const invoice = transition({ clientId: 'transition-39af4fe5-b06f-46f2-8e3d-22510255a91c', code: 'GLOBAL_ACTION_1781572618528', name: 'Enviar comprobante', effect: 'RUN_ACTIONS', isGlobal: true, actions: [action('MARK_INVOICE_SENT')] });
const deliveryConditions = [condition('SCHEDULE_DELIVERY_WINDOW', { maxDaysBefore: 0, minDaysBefore: 0 }, 0), condition('IS_PAID', {}, 1)];
const finalDeliveryConditions = [condition('IS_PAID', {}, 0), condition('SCHEDULE_DELIVERY_WINDOW', { minDaysBefore: 0, maxDaysBefore: 0 }, 1)];

const scheduledTransitions = (requiredFields: string[]) => {
  const conditions = [condition('SCHEDULE_DELIVERY_WINDOW', { maxDaysBefore: 1, minDaysBefore: 0 }, 0), condition('HAS_STOCK', {}, 1), ...requiredFields.map((field, index) => condition('SALE_ORDER_FIELD_REQUIRED', { field }, index + 2))];
  return [
    transition({ clientId: 'transition-5a1e73b2-e8c3-4442-9518-ff702b76315c', code: 'TRANSITION_1781572278618', name: 'Programado', fromStateRef: CREATED, toStateRef: SCHEDULED, sourceHandle: 'bottom', targetHandle: 'top', autoTrigger: true, conditions, actions: [action('RESERVE_STOCK')], elseEffect: 'MOVE_STATE', elseToStateRef: WAITING_STOCK }),
    transition({ clientId: 'transition-1fbb425c-0150-4ffd-95bc-be918316279a', code: 'TRANSITION_1781572317577', name: 'Programado', fromStateRef: WAITING_STOCK, toStateRef: SCHEDULED, sourceHandle: 'bottom', targetHandle: 'right', autoTrigger: true, conditions, actions: [action('RESERVE_STOCK')] }),
  ];
};

export const ABONADO_WORKFLOW_SEEDS: WorkflowSeed[] = [
  {
    name: 'ABONADO ENVIO', description: null, isActive: true,
    states: [...baseStates, { clientId: WAITING_PAYMENT, saleOrderStateId: '2f512296-827a-42cb-a6cf-5afa2e64798b', position: 6, positionX: -252.69081024846213, positionY: 54.25392040981811, isInitial: false, isFinal: false, isActive: true }],
    transitions: [cancel, ...scheduledTransitions(['client.docNumber', 'agencyDetail', 'deliveryDate']), transition({ clientId: 'transition-8fe32a42-9246-4775-ac52-76231fe6464f', code: 'TRANSITION_1781572467897', name: 'Entregado', fromStateRef: SCHEDULED, toStateRef: DELIVERED, sourceHandle: 'bottom', targetHandle: 'top', autoTrigger: true, conditions: deliveryConditions, actions: [action('CONSUME_STOCK')], elseEffect: 'MOVE_STATE', elseToStateRef: WAITING_PAYMENT }), transition({ clientId: 'transition-f2351bba-52c4-49c8-8c1a-3ac49b7bbc38', code: 'TRANSITION_1781572506056', name: 'Entregado', fromStateRef: WAITING_PAYMENT, toStateRef: DELIVERED, sourceHandle: 'bottom', targetHandle: 'right', autoTrigger: true, conditions: finalDeliveryConditions, actions: [action('CONSUME_STOCK')] }), invoice],
  },
  {
    name: 'ABONADO CE', description: null, isActive: true,
    states: [...baseStates, { clientId: WAITING_CE, saleOrderStateId: 'af85cf11-7af0-46bf-8596-d52fa57b70d7', position: 5, positionX: -295.0832593183438, positionY: 56.00539904254954, isInitial: false, isFinal: false, isActive: true }],
    transitions: [cancel, ...scheduledTransitions(['deliveryDate', 'client.districtId']), transition({ clientId: 'transition-8fe32a42-9246-4775-ac52-76231fe6464f', code: 'TRANSITION_1781572467897', name: 'Entregado', fromStateRef: SCHEDULED, toStateRef: DELIVERED, sourceHandle: 'bottom', targetHandle: 'top', autoTrigger: true, conditions: deliveryConditions, actions: [action('CONSUME_STOCK')], elseEffect: 'MOVE_STATE', elseToStateRef: WAITING_CE }), invoice, transition({ clientId: 'transition-72cab282-6841-4309-a914-ed2fad398358', code: 'TRANSITION_1781975902242', name: 'Entregado', fromStateRef: WAITING_CE, toStateRef: DELIVERED, sourceHandle: 'bottom', targetHandle: 'right', autoTrigger: true, conditions: finalDeliveryConditions, actions: [action('CONSUME_STOCK')] })],
  },
];
