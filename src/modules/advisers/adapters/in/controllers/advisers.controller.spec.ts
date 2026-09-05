import { GUARDS_METADATA } from '@nestjs/common/constants';
import {
  PERMISSION_GROUPS_KEY,
  PERMISSIONS_KEY,
} from 'src/modules/access-control/adapters/in/decorators/require-permissions.decorator';
import { PermissionsGuard } from 'src/modules/access-control/adapters/in/guards/permissions.guard';
import { AdvisersController } from './advisers.controller';

const permissionsFor = (method: keyof AdvisersController) =>
  Reflect.getMetadata(PERMISSIONS_KEY, AdvisersController.prototype[method]);

describe('AdvisersController permissions', () => {
  it('applies the permissions guard to the complete controller', () => {
    const guards =
      Reflect.getMetadata(GUARDS_METADATA, AdvisersController) ?? [];

    expect(guards).toContain(PermissionsGuard);
  });

  it('protects adviser operations with the expected granular permissions', () => {
    expect(permissionsFor('summaryList')).toEqual(['advisers.view']);
    expect(permissionsFor('adviserOrderList')).toEqual([
      'advisers.view',
      'advisers.view_orders',
    ]);
    expect(permissionsFor('analytics')).toEqual([
      'advisers.view',
      'advisers.view_performance',
    ]);
    expect(permissionsFor('listCandidates')).toEqual(['advisers.manage']);
    expect(permissionsFor('create')).toEqual(['advisers.manage']);
    expect(permissionsFor('setAdviserActive')).toEqual(['advisers.manage']);
    expect(permissionsFor('update')).toEqual(['advisers.manage']);
  });

  it('allows the shared adviser catalog for adviser viewers or order assignment', () => {
    const groups = Reflect.getMetadata(
      PERMISSION_GROUPS_KEY,
      AdvisersController.prototype.list,
    );

    expect(groups).toEqual([
      [
        'advisers.view',
        'sale_orders.assign_adviser',
        'sale_orders.adviser_import_aliases.view',
        'sale_orders.adviser_import_aliases.manage',
      ],
    ]);
  });
});
