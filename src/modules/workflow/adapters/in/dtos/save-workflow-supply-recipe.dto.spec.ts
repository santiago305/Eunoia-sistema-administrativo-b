import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SaveWorkflowSupplyRecipeDto } from './save-workflow-supply-recipe.dto';

const payload = (quantity: number) => plainToInstance(SaveWorkflowSupplyRecipeDto, {
  items: [{
    supplySkuId: '8dd182ce-3033-4e3f-93f8-a3844a48d5ed',
    quantity,
    unitId: '958519b7-1fb6-4479-b4cc-a269080b7a21',
  }],
});

describe('SaveWorkflowSupplyRecipeDto', () => {
  it('accepts quantities with up to two decimals', async () => {
    expect(await validate(payload(1.25))).toHaveLength(0);
  });

  it.each([0.001, 1.234])('rejects the invalid quantity %s', async (quantity) => {
    const errors = await validate(payload(quantity));
    expect(errors).not.toHaveLength(0);
  });
});
