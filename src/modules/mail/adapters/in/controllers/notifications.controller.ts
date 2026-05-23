import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/access-control/adapters/in/guards/permissions.guard';
import { RequirePermissions } from 'src/modules/access-control/adapters/in/decorators/require-permissions.decorator';
import { User as CurrentUser } from 'src/shared/utilidades/decorators/user.decorator';
import { NotificationsService } from 'src/modules/mail/application/use-cases/notifications.service';
import { CreateMessageDto } from '../dtos/create-message.dto';
import { CreateScheduledMessageDto } from '../dtos/create-scheduled-message.dto';
import { ListMessagesQueryDto } from '../dtos/list-messages.query';
import { ReplyForwardMessageDto } from '../dtos/reply-forward-message.dto';
import { CreateDraftDto } from '../dtos/create-draft.dto';
import { UpdateDraftDto } from '../dtos/update-draft.dto';
import { SendDraftDto } from '../dtos/send-draft.dto';
import { BulkMessageActionDto } from '../dtos/bulk-message-action.dto';
import { CreateLabelDto } from '../dtos/create-label.dto';
import { UpdateLabelDto } from '../dtos/update-label.dto';
import { SnoozeMessageDto } from '../dtos/snooze-message.dto';
import { ScheduleMessageDto } from '../dtos/schedule-message.dto';
import { CreateSearchHistoryDto } from '../dtos/create-search-history.dto';
import { UploadAttachmentDto } from '../dtos/upload-attachment.dto';
import { ListMailActionsQueryDto } from '../dtos/list-mail-actions.query';
import { ExecuteMailActionDto } from '../dtos/execute-mail-action.dto';
import { UpdateMailStorageQuotaDto } from '../dtos/update-mail-storage-quota.dto';
import { ListMailFilesQueryDto } from '../dtos/list-mail-files.query';
import { BulkDeleteMailFilesDto } from '../dtos/bulk-delete-mail-files.dto';
import { IsOptional, IsUUID } from 'class-validator';

class UpsertModuleLabelConfigDto {
  @IsOptional()
  @IsUUID()
  labelId?: string | null;
}

@Controller('mail')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @RequirePermissions('notifications.read')
  @Get('labels')
  listLabels(@CurrentUser() user: { id: string }) {
    return this.notificationsService.listMyLabels(user.id);
  }

  @RequirePermissions('notifications.read')
  @Get('module-label-configs')
  listModuleLabelConfigs() {
    return this.notificationsService.listModuleLabelConfigs();
  }

  @RequirePermissions('notifications.manage')
  @Patch('module-label-configs/:moduleKey')
  upsertModuleLabelConfig(
    @CurrentUser() user: { id: string },
    @Param('moduleKey') moduleKey: string,
    @Body() body: UpsertModuleLabelConfigDto,
  ) {
    return this.notificationsService.upsertModuleLabelConfig(user.id, moduleKey, body.labelId ?? null);
  }

  @RequirePermissions('notifications.labels.create')
  @Post('labels')
  createLabel(@CurrentUser() user: { id: string }, @Body() body: CreateLabelDto) {
    return this.notificationsService.createCustomLabel(user.id, body.name, body.color);
  }

  @RequirePermissions('notifications.labels.create')
  @Delete('labels/:id')
  deleteLabel(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.deactivateCustomLabel(user.id, id);
  }

  @RequirePermissions('notifications.labels.create')
  @Patch('labels/:id')
  updateLabel(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() body: UpdateLabelDto) {
    return this.notificationsService.updateCustomLabel(user.id, id, body);
  }

  @RequirePermissions('notifications.manage')
  @Post('messages/:id/labels/:labelId')
  assignLabelToMessage(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('labelId') labelId: string,
  ) {
    return this.notificationsService.assignLabelToMessage(user.id, id, labelId);
  }

  @RequirePermissions('notifications.manage')
  @Delete('messages/:id/labels/:labelId')
  removeLabelFromMessage(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('labelId') labelId: string,
  ) {
    return this.notificationsService.removeLabelFromMessage(user.id, id, labelId);
  }

  @RequirePermissions('notifications.read')
  @Get('messages')
  listMessages(@CurrentUser() user: { id: string }, @Query() query: ListMessagesQueryDto) {
    return this.notificationsService.listMessages(user.id, {
      view: query.view,
      originModule: query.originModule,
      q: query.q,
      page: query.page,
      limit: query.limit,
      read: query.read,
      hasAttachments: query.hasAttachments,
      labelId: query.labelId,
    });
  }

  @RequirePermissions('notifications.read')
  @Get('messages/count')
  countMessages(@CurrentUser() user: { id: string }, @Query() query: ListMessagesQueryDto) {
    return this.notificationsService.countMessages(user.id, {
      view: query.view,
      originModule: query.originModule,
      read: query.read,
      hasAttachments: query.hasAttachments,
      labelId: query.labelId,
    });
  }

  @RequirePermissions('notifications.read')
  @Get('messages/sidebar-counts')
  countSidebarMessages(
    @CurrentUser() user: { id: string },
    @Query('labelIds') labelIdsRaw?: string,
  ) {
    const labelIds = (labelIdsRaw ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    return this.notificationsService.countSidebarMessages(user.id, labelIds);
  }

  @RequirePermissions('notifications.read')
  @Get('messages/has-unread')
  hasUnreadMessages(@CurrentUser() user: { id: string }) {
    return this.notificationsService.hasUnreadMessages(user.id);
  }

  @RequirePermissions('notifications.read')
  @Get('storage/me')
  getMyStorageSummary(@CurrentUser() user: { id: string }) {
    return this.notificationsService.getMyStorageSummary(user.id);
  }

  @RequirePermissions('notifications.read')
  @Get('files')
  listMyFiles(
    @CurrentUser() user: { id: string },
    @Query() query: ListMailFilesQueryDto,
  ) {
    return this.notificationsService.listMyFiles(user.id, query);
  }

  @RequirePermissions('notifications.manage')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Delete('files/:attachmentId')
  deleteMyFile(
    @CurrentUser() user: { id: string },
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.notificationsService.deleteMyFile(user.id, attachmentId);
  }

  @RequirePermissions('notifications.manage')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('files/bulk-delete')
  bulkDeleteMyFiles(
    @CurrentUser() user: { id: string },
    @Body() body: BulkDeleteMailFilesDto,
  ) {
    return this.notificationsService.bulkDeleteMyFiles(user.id, body.attachmentIds ?? []);
  }

  @RequirePermissions('users.update')
  @Patch('storage/me/quota')
  updateMyStorageQuota(
    @CurrentUser() user: { id: string },
    @Body() body: UpdateMailStorageQuotaDto,
  ) {
    return this.notificationsService.updateMyStorageQuota(user.id, body.mailStorageQuotaGb);
  }

  @RequirePermissions('users.read')
  @Get('storage/users/:id')
  getUserStorageSummary(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.notificationsService.getUserStorageSummary(user.id, id);
  }

  @RequirePermissions('users.update')
  @Patch('storage/users/:id/quota')
  updateUserStorageQuota(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: UpdateMailStorageQuotaDto,
  ) {
    return this.notificationsService.updateUserStorageQuota(user.id, id, body.mailStorageQuotaGb);
  }

  @RequirePermissions('notifications.read')
  @Get('messages/:id')
  getMessageDetail(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.getMessageDetail(user.id, id);
  }

  @RequirePermissions('notifications.read')
  @Get('actions')
  listActions(@CurrentUser() user: { id: string }, @Query() query: ListMailActionsQueryDto) {
    return this.notificationsService.listMessageActions(user.id, {
      threadId: query.threadId,
      messageId: query.messageId,
    });
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @RequirePermissions('notifications.manage')
  @Post('actions/:id/execute')
  executeAction(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: ExecuteMailActionDto,
  ) {
    return this.notificationsService.executeMessageAction({
      userId: user.id,
      actionId: id,
      comment: body.comment,
    });
  }

  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  @RequirePermissions('notifications.manage')
  @Post('messages')
  sendMessage(@CurrentUser() user: { id: string }, @Body() body: CreateMessageDto) {
    return this.notificationsService.sendMessage({
      senderUserId: user.id,
      to: body.to,
      cc: body.cc,
      bcc: body.bcc,
      recipients: body.recipients,
      subject: body.subject,
      bodyHtml: body.bodyHtml,
      bodyJson: body.bodyJson,
      originModule: body.originModule,
      labelIds: body.labelIds ?? [],
      attachmentIds: body.attachmentIds ?? [],
    });
  }

  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  @RequirePermissions('notifications.manage')
  @Post('messages/scheduled')
  createScheduledMessage(@CurrentUser() user: { id: string }, @Body() body: CreateScheduledMessageDto) {
    return this.notificationsService.createScheduledMessage({
      senderUserId: user.id,
      to: body.to,
      cc: body.cc,
      bcc: body.bcc,
      recipients: body.recipients,
      subject: body.subject,
      bodyHtml: body.bodyHtml,
      bodyJson: body.bodyJson,
      scheduledAt: body.scheduledAt,
      originModule: body.originModule,
      labelIds: body.labelIds ?? [],
      attachmentIds: body.attachmentIds ?? [],
    });
  }

  @RequirePermissions('notifications.manage')
  @Patch('messages/:id/schedule')
  rescheduleMessage(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: ScheduleMessageDto,
  ) {
    return this.notificationsService.rescheduleMessage(user.id, id, body.scheduledAt);
  }

  @RequirePermissions('notifications.manage')
  @Delete('messages/:id/schedule')
  cancelScheduledMessage(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.cancelScheduledMessage(user.id, id);
  }

  @RequirePermissions('notifications.manage')
  @Post('messages/:id/schedule/send-now')
  sendScheduledMessageNow(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.sendScheduledMessageNow(user.id, id);
  }

  @RequirePermissions('notifications.manage')
  @Patch('messages/:id/read')
  markMessageAsRead(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.markMessageAsRead(user.id, id);
  }

  @RequirePermissions('notifications.manage')
  @Patch('messages/:id/unread')
  markMessageAsUnread(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.markMessageAsUnread(user.id, id);
  }

  @RequirePermissions('notifications.manage')
  @Patch('messages/:id/star')
  starMessage(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.toggleStarMessage(user.id, id, true);
  }

  @RequirePermissions('notifications.manage')
  @Patch('messages/:id/unstar')
  unstarMessage(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.toggleStarMessage(user.id, id, false);
  }

  @RequirePermissions('notifications.manage')
  @Delete('messages/:id')
  deleteMessage(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.deleteMessage(user.id, id);
  }

  @RequirePermissions('notifications.manage')
  @Delete('messages/:id/permanent')
  permanentlyDeleteMessage(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.permanentlyDeleteMessage(user.id, id);
  }

  @RequirePermissions('notifications.manage')
  @Patch('messages/:id/archive')
  archiveMessage(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.archiveMessage(user.id, id);
  }

  @RequirePermissions('notifications.manage')
  @Patch('messages/:id/unarchive')
  unarchiveMessage(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.unarchiveMessage(user.id, id);
  }

  @RequirePermissions('notifications.manage')
  @Patch('messages/:id/snooze')
  snoozeMessage(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() body: SnoozeMessageDto) {
    return this.notificationsService.snoozeMessage(user.id, id, body.snoozedUntil);
  }

  @RequirePermissions('notifications.manage')
  @Patch('messages/:id/unsnooze')
  unsnoozeMessage(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.unsnoozeMessage(user.id, id);
  }

  @RequirePermissions('notifications.manage')
  @Patch('messages/:id/restore')
  restoreMessage(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.restoreMessage(user.id, id);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @RequirePermissions('notifications.manage')
  @Post('messages/bulk')
  bulkUpdateMessages(@CurrentUser() user: { id: string }, @Body() body: BulkMessageActionDto) {
    return this.notificationsService.bulkUpdateMessages(user.id, body);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @RequirePermissions('notifications.manage')
  @Post('messages/:id/reply')
  replyMessage(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: ReplyForwardMessageDto,
  ) {
    return this.notificationsService.replyMessage({
      senderUserId: user.id,
      parentMessageId: id,
      bodyHtml: body.bodyHtml,
      bodyJson: body.bodyJson,
      to: body.to,
      cc: body.cc,
      bcc: body.bcc,
      recipients: body.recipients,
      attachmentIds: body.attachmentIds ?? [],
    });
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @RequirePermissions('notifications.manage')
  @Post('messages/:id/forward')
  forwardMessage(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: ReplyForwardMessageDto,
  ) {
    return this.notificationsService.forwardMessage({
      senderUserId: user.id,
      parentMessageId: id,
      bodyHtml: body.bodyHtml,
      bodyJson: body.bodyJson,
      to: body.to,
      cc: body.cc,
      bcc: body.bcc,
      recipients: body.recipients ?? '',
      attachmentIds: body.attachmentIds ?? [],
    });
  }

  @RequirePermissions('notifications.read')
  @Get('drafts')
  listDrafts(@CurrentUser() user: { id: string }) {
    return this.notificationsService.listDrafts(user.id);
  }

  @RequirePermissions('notifications.manage')
  @Post('drafts')
  createDraft(@CurrentUser() user: { id: string }, @Body() body: CreateDraftDto) {
    return this.notificationsService.createDraft({
      userId: user.id,
      recipients: body.recipients,
      subject: body.subject,
      bodyHtml: body.bodyHtml,
      bodyJson: body.bodyJson,
      originModule: body.originModule,
    });
  }

  @RequirePermissions('notifications.manage')
  @Patch('drafts/:id')
  updateDraft(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() body: UpdateDraftDto) {
    return this.notificationsService.updateDraft({
      userId: user.id,
      draftId: id,
      recipients: body.recipients,
      subject: body.subject,
      bodyHtml: body.bodyHtml,
      bodyJson: body.bodyJson,
    });
  }

  @RequirePermissions('notifications.manage')
  @Delete('drafts/:id')
  deleteDraft(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.deleteDraft(user.id, id);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @RequirePermissions('notifications.manage')
  @Post('drafts/:id/send')
  sendDraft(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() body: SendDraftDto) {
    return this.notificationsService.sendDraft(user.id, id, body.recipients, body.attachmentIds ?? []);
  }

  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @RequirePermissions('notifications.manage')
  @Post('attachments')
  @UseInterceptors(FileInterceptor('file'))
  uploadAttachment(
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadAttachmentDto,
  ) {
    return this.notificationsService.uploadAttachment({
      userId: user.id,
      fileName: file?.originalname ?? '',
      mimeType: file?.mimetype ?? '',
      size: file?.size ?? 0,
      buffer: file?.buffer ?? Buffer.alloc(0),
      messageId: body.messageId,
      draftId: body.draftId,
      kind: body.kind,
    });
  }

  @RequirePermissions('notifications.read')
  @Get('attachments/:id/download')
  async downloadAttachment(@CurrentUser() user: { id: string }, @Param('id') id: string, @Res() res: Response) {
    try {
      const file = await this.notificationsService.downloadAttachment(user.id, id);
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.fileName)}"`);
      res.send(file.buffer);
    } catch (error) {
      const isUnavailable =
        error instanceof NotFoundException && String(error.message ?? '').includes('ATTACHMENT_UNAVAILABLE');
      const acceptsHtml = String(res.req.headers.accept ?? '').includes('text/html');

      if (isUnavailable && acceptsHtml) {
        res.status(404).type('text/html').send(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Archivo inexistente</title>
    <style>
      body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;color:#0f172a}
      .wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
      .card{max-width:560px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:28px;box-shadow:0 8px 24px rgba(15,23,42,.08)}
      h1{margin:0 0 8px;font-size:22px}
      p{margin:0;color:#475569;line-height:1.5}
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="card">
        <h1>Archivo inexistente</h1>
        <p>Archivo solicitado ya no se encuentra disponible o fue eliminado.</p>
      </section>
    </main>
  </body>
</html>`);
        return;
      }

      throw error;
    }
  }

  @RequirePermissions('notifications.manage')
  @Delete('attachments/:id')
  deleteAttachment(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.deleteAttachment(user.id, id);
  }

  @RequirePermissions('notifications.read')
  @Get('search-history')
  listSearchHistory(@CurrentUser() user: { id: string }) {
    return this.notificationsService.listSearchHistory(user.id);
  }

  @RequirePermissions('notifications.manage')
  @Post('search-history')
  saveSearchHistory(@CurrentUser() user: { id: string }, @Body() body: CreateSearchHistoryDto) {
    return this.notificationsService.saveSearchHistory(user.id, body.query);
  }

  @RequirePermissions('notifications.manage')
  @Delete('search-history/:id')
  deleteSearchHistory(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.deleteSearchHistory(user.id, id);
  }

}
