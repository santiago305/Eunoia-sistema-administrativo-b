import {
  WORKFLOW_LIFECYCLE,
  WorkflowLifecycleStatus,
} from '../constants/workflow-lifecycle.constants';

export type WorkflowProps = {
  id: string;
  name: string;
  normalizedName: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  familyId?: string;
  revision?: number;
  lifecycleStatus?: WorkflowLifecycleStatus;
  isCurrent?: boolean;
  basedOnWorkflowId?: string | null;
  publishedAt?: Date | null;
  publishedBy?: string | null;
};

export class Workflow {
  readonly id: string;
  readonly name: string;
  readonly normalizedName: string;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date | null;
  readonly familyId: string;
  readonly revision: number;
  readonly lifecycleStatus: WorkflowLifecycleStatus;
  readonly isCurrent: boolean;
  readonly basedOnWorkflowId: string | null;
  readonly publishedAt: Date | null;
  readonly publishedBy: string | null;

  constructor(props: WorkflowProps) {
    this.id = props.id;
    this.name = props.name.trim();
    this.normalizedName = props.normalizedName.trim();
    this.description = props.description?.trim() || null;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.familyId = props.familyId ?? props.id;
    this.revision = props.revision ?? 1;
    this.lifecycleStatus = props.lifecycleStatus ?? WORKFLOW_LIFECYCLE.PUBLISHED;
    this.isCurrent = props.isCurrent ?? true;
    this.basedOnWorkflowId = props.basedOnWorkflowId ?? null;
    this.publishedAt = props.publishedAt ?? null;
    this.publishedBy = props.publishedBy ?? null;
  }
}
