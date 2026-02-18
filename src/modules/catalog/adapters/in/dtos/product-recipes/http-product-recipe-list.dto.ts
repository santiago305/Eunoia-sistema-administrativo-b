import { IsUUID } from 'class-validator';

export class ListProductRecipesQueryDto {
  @IsUUID()
  variantId: string;
}
