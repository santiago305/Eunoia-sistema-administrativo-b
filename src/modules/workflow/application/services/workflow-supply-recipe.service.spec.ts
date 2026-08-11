import { BadRequestException } from '@nestjs/common';
import { normalizeWorkflowSupplyQuantity } from './workflow-supply-recipe.service';

describe('normalizeWorkflowSupplyQuantity', () => {
  it.each([0.01, 1, 12.34])('accepts %s', (quantity) => {
    expect(normalizeWorkflowSupplyQuantity(quantity)).toBe(quantity);
  });

  it.each([0, 0.001, 1.234, Number.NaN, Number.POSITIVE_INFINITY])('rejects %s', (quantity) => {
    expect(() => normalizeWorkflowSupplyQuantity(quantity)).toThrow(BadRequestException);
  });
});
