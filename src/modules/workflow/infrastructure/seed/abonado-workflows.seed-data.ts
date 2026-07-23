import { WorkflowActionType } from '../../domain/entities/workflow-action';
import { WorkflowConditionType } from '../../domain/entities/workflow-condition';
import { WorkflowTransitionEffect } from '../../domain/constants/workflow-transition-effect.constants';
import { WorkflowTransitionPurpose } from '../../domain/constants/workflow-transition-purpose.constants';
import { DEFAULT_WAREHOUSE_IDS } from 'src/modules/warehouses/infrastructure/seed/warehouse.seeder';

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
const assignWarehouseByProvince = (
  provinceIds: string[],
  warehouseId: string,
  position: number,
  mode: 'INCLUDE' | 'EXCLUDE' = 'INCLUDE',
): WorkflowActionSeed => ({
  type: 'ASSIGN_WAREHOUSE_BY_PROVINCE',
  config: { mode, provinceIds, warehouseId },
  position,
});

const transition = (value: Partial<WorkflowTransitionSeed> & Pick<WorkflowTransitionSeed, 'clientId' | 'code' | 'name'>): WorkflowTransitionSeed => ({
  effect: 'MOVE_STATE', fromStateRef: null, toStateRef: null, isGlobal: false, excludedStateRefs: [], purpose: 'STANDARD',
  sourceHandle: null, targetHandle: null, isActive: true, autoTrigger: false, priority: 0, conditions: [], actions: [],
  elseEffect: null, elseToStateRef: null, elseActions: [], ...value,
});

const invoice = (clientId: string) => transition({ clientId, code: 'GLOBAL_ACTION_1781572618528', name: 'Enviar comprobante', effect: 'RUN_ACTIONS', isGlobal: true, actions: [action('MARK_INVOICE_SENT')] });
const zeroDayWindow = () => condition('SCHEDULE_DELIVERY_WINDOW', { minDaysBefore: 0, maxDaysBefore: 0 }, 0);
const scheduleConditions = (fields: string[]) => [
  condition('SCHEDULE_DELIVERY_WINDOW', { maxDaysBefore: 1, minDaysBefore: 0 }, 0),
  condition('HAS_STOCK', {}, 1),
  ...fields.map((field, index) => condition('SALE_ORDER_FIELD_REQUIRED', { field }, index + 2)),
];

const CE_CANCELLED = ref('5541aa6a-1d54-5b42-b960-bc810cbc20f8');
const CE_DRAFT = ref('28727e88-c8a2-473e-8bf8-b47e7ac63f87');
const CE_CREATED = ref('c56b417c-74d1-56bf-b2a5-fa790a6c6f2a');
const CE_SCHEDULED = ref('343913c6-093f-51ee-aa29-c78ca2559707');
const CE_WAITING_STOCK = ref('75e6f738-f64d-5e40-aac2-112412040bf2');
const CE_WAITING_CE = ref('7c077713-3303-5bfc-969f-c8c0a3bf2457');
const CE_DELIVERED = ref('fda18798-a005-5454-a162-22d135918e8f');

const ENVIO_CANCELLED = ref('55a0b631-3261-500c-8eec-57cc6676082e');
const ENVIO_DRAFT = ref('28727e88-c8a2-473e-8bf8-b47e7ac63f87');
const ENVIO_CREATED = ref('ce6fb031-1245-5683-802b-63e6a10167b4');
const ENVIO_SCHEDULED = ref('805b9bd3-5efb-51a4-a93e-1c06ea49357a');
const ENVIO_WAITING_STOCK = ref('ef609d8b-a3d0-597f-9345-60fe5c46ee38');
const ENVIO_DELIVERED = ref('51db9539-a81c-5dab-93a9-0ecd49a28c23');
const ENVIO_WAITING_PAYMENT = ref('35e95b95-3687-5caa-8bcd-fb27f1a193ee');

const draftToCreatedTransition = (clientId: string, fromStateRef: string, toStateRef: string) => transition({
  clientId,
  code: 'TRANSITION_1783039714065',
  name: 'Creado',
  fromStateRef,
  toStateRef,
  sourceHandle: 'right',
  targetHandle: 'top',
  autoTrigger: true,
  conditions: [condition('SALE_ORDER_FIELD_REQUIRED', { field: 'client.provinceId' }, 0)],
  actions: [
    assignWarehouseByProvince(['2001', '2006'], DEFAULT_WAREHOUSE_IDS.piura, 0),
    assignWarehouseByProvince(['2001', '2006'], DEFAULT_WAREHOUSE_IDS.lima, 1, 'EXCLUDE'),
  ],
});

export const ABONADO_WORKFLOW_SEEDS: WorkflowSeed[] = [
  {
    name: 'ABONADO ENVIO', description: null, isActive: true,
    states: [
      { clientId: ENVIO_CANCELLED, saleOrderStateId: '21b5669b-fc3a-4bf2-9363-4b2d99c4c734', position: 0, positionX: -9999, positionY: -9999, isInitial: false, isFinal: false, isActive: true },
      { clientId: ENVIO_DRAFT, saleOrderStateId: 'f24c85fa-28cc-412a-84d0-118e8d8f5059', position: 6, positionX: -737.0909722293843, positionY: -399.47405709586315, isInitial: true, isFinal: false, isActive: true },
      { clientId: ENVIO_CREATED, saleOrderStateId: 'ae9b51d9-9324-4d15-a648-626a5eabda3d', position: 2, positionX: -562.7316284179688, positionY: -309.2750778198242, isInitial: false, isFinal: false, isActive: true },
      { clientId: ENVIO_SCHEDULED, saleOrderStateId: '2b2b266c-fee2-447d-9bb6-45d90f4d2cc2', position: 3, positionX: -562.5, positionY: -97.93066406249999, isInitial: false, isFinal: false, isActive: true },
      { clientId: ENVIO_WAITING_STOCK, saleOrderStateId: 'f779f1bd-4c20-4fd9-abe5-dfb065b4f1f3', position: 4, positionX: -288.75, positionY: -161.40418207480303, isInitial: false, isFinal: false, isActive: true },
      { clientId: ENVIO_DELIVERED, saleOrderStateId: 'b0ae3f76-f6cd-4f34-88b2-3d4c29aca53f', position: 5, positionX: -245.75334571140957, positionY: 46.33580887812987, isInitial: false, isFinal: true, isActive: true },
      { clientId: ENVIO_WAITING_PAYMENT, saleOrderStateId: '2f512296-827a-42cb-a6cf-5afa2e64798b', position: 6, positionX: -565.6874645370526, positionY: 51.421371502229064, isInitial: false, isFinal: false, isActive: true },
    ],
    transitions: [
      transition({ clientId: 'transition-ba15a520-69ea-581f-919e-61f6875ed1b7', code: 'CANCEL', name: 'Cancelar', toStateRef: ENVIO_CANCELLED, isGlobal: true, excludedStateRefs: [ENVIO_CANCELLED, ENVIO_DELIVERED], purpose: 'CANCEL', actions: [action('REVERT_STOCK')] }),
      transition({ clientId: 'transition-2750c023-0dfc-5093-9bcc-a2994b8a9816', code: 'TRANSITION_1781572278618', name: 'Programado', fromStateRef: ENVIO_CREATED, toStateRef: ENVIO_SCHEDULED, sourceHandle: 'bottom', targetHandle: 'top', autoTrigger: true, conditions: scheduleConditions(['client.docNumber', 'agencyDetail', 'deliveryDate']), actions: [action('RESERVE_STOCK')], elseEffect: 'MOVE_STATE', elseToStateRef: ENVIO_WAITING_STOCK }),
      transition({ clientId: 'transition-25d0d533-69a8-55de-90ac-7afc1aafe385', code: 'TRANSITION_1781572317577', name: 'Programado', fromStateRef: ENVIO_WAITING_STOCK, toStateRef: ENVIO_SCHEDULED, sourceHandle: 'bottom', targetHandle: 'right', autoTrigger: true, conditions: scheduleConditions(['client.docNumber', 'agencyDetail', 'deliveryDate']), actions: [action('RESERVE_STOCK')] }),
      invoice('transition-b7921654-ac9e-5bc4-9553-5a5b4a0fd6a4'),
      transition({ clientId: 'transition-066ebc76-9b33-4636-b61b-a757568cf3a4', code: 'TRANSITION_1782332299577', name: 'Esperando', fromStateRef: ENVIO_SCHEDULED, toStateRef: ENVIO_WAITING_PAYMENT, sourceHandle: 'bottom', targetHandle: 'top', autoTrigger: true, conditions: [zeroDayWindow()] }),
      transition({ clientId: 'transition-140b19ac-050e-4457-828e-ca70d2c8a1ea', code: 'TRANSITION_1782332323009', name: 'Entregado', fromStateRef: ENVIO_WAITING_PAYMENT, toStateRef: ENVIO_DELIVERED, sourceHandle: 'right', targetHandle: 'left', autoTrigger: true, conditions: [condition('IS_PAID', {}, 0)], actions: [action('CONSUME_STOCK')] }),
      draftToCreatedTransition('transition-4882525c-2421-4497-a83e-513cf3f4db5e', ENVIO_DRAFT, ENVIO_CREATED),
    ],
  },
  {
    name: 'ABONADO CE', description: null, isActive: true,
    states: [
      { clientId: CE_CANCELLED, saleOrderStateId: '21b5669b-fc3a-4bf2-9363-4b2d99c4c734', position: 0, positionX: -9999, positionY: -9999, isInitial: false, isFinal: false, isActive: true },
      { clientId: CE_DRAFT, saleOrderStateId: 'f24c85fa-28cc-412a-84d0-118e8d8f5059', position: 6, positionX: -737.0909722293843, positionY: -399.47405709586315, isInitial: true, isFinal: false, isActive: true },
      { clientId: CE_CREATED, saleOrderStateId: 'ae9b51d9-9324-4d15-a648-626a5eabda3d', position: 2, positionX: -562.7316284179688, positionY: -309.2750778198242, isInitial: false, isFinal: false, isActive: true },
      { clientId: CE_SCHEDULED, saleOrderStateId: '2b2b266c-fee2-447d-9bb6-45d90f4d2cc2', position: 3, positionX: -562.5, positionY: -97.93066406249999, isInitial: false, isFinal: false, isActive: true },
      { clientId: CE_WAITING_STOCK, saleOrderStateId: 'f779f1bd-4c20-4fd9-abe5-dfb065b4f1f3', position: 4, positionX: -288.75, positionY: -161.40418207480303, isInitial: false, isFinal: false, isActive: true },
      { clientId: CE_WAITING_CE, saleOrderStateId: 'af85cf11-7af0-46bf-8596-d52fa57b70d7', position: 5, positionX: -565.5916799930985, positionY: 89.99598593361819, isInitial: false, isFinal: false, isActive: true },
      { clientId: CE_DELIVERED, saleOrderStateId: 'b0ae3f76-f6cd-4f34-88b2-3d4c29aca53f', position: 5, positionX: -271.2462858797111, positionY: 80.3263957691985, isInitial: false, isFinal: true, isActive: true },
    ],
    transitions: [
      transition({ clientId: 'transition-f852834f-6128-5a60-b86c-7e5f04f38d73', code: 'CANCEL', name: 'Cancelar', toStateRef: CE_CANCELLED, isGlobal: true, excludedStateRefs: [CE_CANCELLED, CE_DELIVERED], purpose: 'CANCEL', actions: [action('REVERT_STOCK')] }),
      transition({ clientId: 'transition-0d5798d4-0bcc-5255-811f-5b7ce90c36fc', code: 'TRANSITION_1781572278618', name: 'Programado', fromStateRef: CE_CREATED, toStateRef: CE_SCHEDULED, sourceHandle: 'bottom', targetHandle: 'top', autoTrigger: true, conditions: scheduleConditions(['deliveryDate', 'client.districtId']), actions: [action('RESERVE_STOCK')], elseEffect: 'MOVE_STATE', elseToStateRef: CE_WAITING_STOCK }),
      transition({ clientId: 'transition-ce6f69fd-091b-59b3-9202-57fa60209518', code: 'TRANSITION_1781572317577', name: 'Programado', fromStateRef: CE_WAITING_STOCK, toStateRef: CE_SCHEDULED, sourceHandle: 'bottom', targetHandle: 'right', autoTrigger: true, conditions: scheduleConditions(['deliveryDate', 'client.districtId']), actions: [action('RESERVE_STOCK')] }),
      invoice('transition-975ac69f-0f5b-5243-ad05-15a718071c86'),
      transition({ clientId: 'transition-4b4fa96f-f2d0-4ec0-b979-e45ec54a9b82', code: 'TRANSITION_1782331809935', name: 'En curso', fromStateRef: CE_SCHEDULED, toStateRef: CE_WAITING_CE, sourceHandle: 'bottom', targetHandle: 'top', autoTrigger: true, conditions: [zeroDayWindow()] }),
      transition({ clientId: 'transition-1af5d252-51a8-4cf5-89a3-690adaf80646', code: 'TRANSITION_1782331894592', name: 'Entregado', fromStateRef: CE_WAITING_CE, toStateRef: CE_DELIVERED, sourceHandle: 'right', targetHandle: 'left', autoTrigger: true, conditions: [condition('IS_PAID', {}, 0)], actions: [action('CONSUME_STOCK')] }),
      draftToCreatedTransition('transition-4882525c-2421-4497-a83e-513cf3f4db5e', CE_DRAFT, CE_CREATED),
    ],
  },
];
