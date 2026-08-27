import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/access-control/adapters/in/guards/permissions.guard';
import { RequirePermissions } from 'src/modules/access-control/adapters/in/decorators/require-permissions.decorator';
import { CompanyConfiguredGuard } from 'src/shared/utilidades/guards/company-configured.guard';
import { User as CurrentUser } from 'src/shared/utilidades/decorators';
import { WorkflowRevisionLifecycleService } from '../../../application/services/workflow-revision-lifecycle.service';
import { StartWorkflowDraftTestDto } from '../dtos/start-workflow-draft-test.dto';

@Controller('workflow-revisions')
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class WorkflowRevisionsController {
  constructor(private readonly lifecycle: WorkflowRevisionLifecycleService) {}

  @Get(':draftId/publish-preview')
  @RequirePermissions('sale_orders.workflows.manage')
  preview(@Param('draftId', ParseUUIDPipe) draftWorkflowId: string) {
    return this.lifecycle.previewPublish(draftWorkflowId);
  }

  @Post(':draftId/publish')
  @RequirePermissions('sale_orders.workflows.manage')
  publish(
    @Param('draftId', ParseUUIDPipe) draftWorkflowId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.lifecycle.publish({ draftWorkflowId, executedBy: user.id });
  }

  @Get(':draftId/tests')
  @RequirePermissions('sale_orders.workflows.manage')
  listTests(@Param('draftId', ParseUUIDPipe) draftWorkflowId: string) {
    return this.lifecycle.listTests(draftWorkflowId);
  }

  @Post(':draftId/tests')
  @RequirePermissions('sale_orders.workflows.manage')
  startTest(
    @Param('draftId', ParseUUIDPipe) draftWorkflowId: string,
    @Body() body: StartWorkflowDraftTestDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.lifecycle.startTest({
      draftWorkflowId,
      saleOrderId: body.saleOrderId,
      executedBy: user.id,
    });
  }

  @Post(':draftId/tests/:sessionId/revert')
  @RequirePermissions('sale_orders.workflows.manage')
  revertTest(
    @Param('draftId', ParseUUIDPipe) draftWorkflowId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.lifecycle.revertTest({
      draftWorkflowId,
      sessionId,
      executedBy: user.id,
    });
  }
}
