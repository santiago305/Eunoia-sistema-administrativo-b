import { IsUUID } from 'class-validator';

export class ListProductEquivalencesQueryDto {
  @IsUUID()
  variantId: string;
}
