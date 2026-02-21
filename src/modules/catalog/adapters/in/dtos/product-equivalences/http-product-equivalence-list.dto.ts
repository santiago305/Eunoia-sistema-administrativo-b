import { IsUUID } from 'class-validator';

export class ListProductEquivalencesQueryDto {
  @IsUUID()
  productId: string;
}
