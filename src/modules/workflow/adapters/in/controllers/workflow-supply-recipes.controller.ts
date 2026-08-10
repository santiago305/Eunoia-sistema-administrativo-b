import { Body, Controller, Get, Param, ParseUUIDPipe, Put, UseGuards } from '@nestjs/common';
import { RequireAnyPermissionGroups } from 'src/modules/access-control/adapters/in/decorators/require-permissions.decorator';
import { PermissionsGuard } from 'src/modules/access-control/adapters/in/guards/permissions.guard';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { CompanyConfiguredGuard } from 'src/shared/utilidades/guards/company-configured.guard';
import { WorkflowSupplyRecipeService } from '../../../application/services/workflow-supply-recipe.service';
import { SaveWorkflowSupplyRecipeDto } from '../dtos/save-workflow-supply-recipe.dto';

@Controller('workflow-supply-recipes')
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class WorkflowSupplyRecipesController {
  constructor(private readonly recipes: WorkflowSupplyRecipeService) {}

  @Get(':workflowId')
  @RequireAnyPermissionGroups(['supplies.view', 'catalog.read'])
  get(@Param('workflowId', ParseUUIDPipe) workflowId: string) {
    return this.recipes.getByWorkflowId(workflowId);
  }

  @Put(':workflowId')
  @RequireAnyPermissionGroups(['supplies.update'])
  save(
    @Param('workflowId', ParseUUIDPipe) workflowId: string,
    @Body() dto: SaveWorkflowSupplyRecipeDto,
  ) {
    return this.recipes.save(workflowId, dto);
  }
}
