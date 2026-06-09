export type WorkflowProps = {
  id: string;
  name: string;
  normalizedName: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date | null;
};

export class Workflow {
  readonly id: string;
  readonly name: string;
  readonly normalizedName: string;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date | null;

  constructor(props: WorkflowProps) {
    this.id = props.id;
    this.name = props.name.trim();
    this.normalizedName = props.normalizedName.trim();
    this.description = props.description?.trim() || null;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
