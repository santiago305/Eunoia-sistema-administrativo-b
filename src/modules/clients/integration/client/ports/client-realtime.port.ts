import { Observable } from "rxjs";

export const CLIENT_REALTIME = Symbol("CLIENT_REALTIME");

export const CLIENT_WORKFLOW_FIELDS = [
  "client.docNumber",
  "client.address",
  "client.reference",
  "client.docType",
  "client.departmentId",
  "client.provinceId",
  "client.districtId",
] as const;

export type ClientWorkflowField = (typeof CLIENT_WORKFLOW_FIELDS)[number];

export type ClientUpdatedEvent = {
  clientId: string;
  changedFields: ClientWorkflowField[];
  occurredAt: string;
};

export type ClientRealtimeMessage = {
  type: "client.updated";
  payload: ClientUpdatedEvent;
};

export interface ClientRealtime {
  emitClientUpdated(event: ClientUpdatedEvent): void;
  stream(): Observable<ClientRealtimeMessage>;
}
