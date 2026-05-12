import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/access-control/adapters/in/guards/permissions.guard';
import { RequirePermissions } from 'src/modules/access-control/adapters/in/decorators/require-permissions.decorator';
import { User as CurrentUser } from 'src/shared/utilidades/decorators/user.decorator';
import { NotificationsService } from 'src/modules/mail/application/use-cases/notifications.service';
import { ListNotificationsQueryDto } from '../dtos/list-notifications.query';
import { CreateMessageDto } from '../dtos/create-message.dto';
import { ListMessagesQueryDto } from '../dtos/list-messages.query';
import { ReplyForwardMessageDto } from '../dtos/reply-forward-message.dto';
import { CreateDraftDto } from '../dtos/create-draft.dto';
import { UpdateDraftDto } from '../dtos/update-draft.dto';
import { SendDraftDto } from '../dtos/send-draft.dto';
import { BulkMessageActionDto } from '../dtos/bulk-message-action.dto';
import { CreateLabelDto } from '../dtos/create-label.dto';

@Controller(['email', 'notifications'])
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @RequirePermissions('notifications.read')
  @Get()
  listMyNotifications(
    @CurrentUser() user: { id: string },
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationsService.listMyNotifications(user.id, query.limit, query.cursor);
  }

  @RequirePermissions('notifications.read')
  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: { id: string }) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @RequirePermissions('notifications.read')
  @Get('modules')
  getAllowedModules(@CurrentUser() user: { id: string }) {
    return this.notificationsService.getAllowedNotificationModules(user.id);
  }

  @RequirePermissions('notifications.read')
  @Get('labels')
  listLabels(@CurrentUser() user: { id: string }) {
    return this.notificationsService.listMyLabels(user.id);
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

  @RequirePermissions('notifications.read')
  @Get('messages')
  listMessages(@CurrentUser() user: { id: string }, @Query() query: ListMessagesQueryDto) {
    return this.notificationsService.listMessages(user.id, query);
  }

  @RequirePermissions('notifications.read')
  @Get('messages/:id')
  getMessageDetail(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.getMessageDetail(user.id, id);
  }

  @RequirePermissions('notifications.manage')
  @Post('messages')
  sendMessage(@CurrentUser() user: { id: string }, @Body() body: CreateMessageDto) {
    return this.notificationsService.sendMessage({
      senderUserId: user.id,
      recipients: body.recipients,
      subject: body.subject,
      bodyHtml: body.bodyHtml,
      originModule: body.originModule,
      labelIds: body.labelIds ?? [],
    });
  }

  @RequirePermissions('notifications.manage')
  @Patch('messages/:id/read')
  markMessageAsRead(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.markMessageAsRead(user.id, id);
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
  @Patch('messages/:id/restore')
  restoreMessage(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.restoreMessage(user.id, id);
  }

  @RequirePermissions('notifications.manage')
  @Post('messages/bulk')
  bulkUpdateMessages(@CurrentUser() user: { id: string }, @Body() body: BulkMessageActionDto) {
    return this.notificationsService.bulkUpdateMessages(user.id, body);
  }

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
      recipients: body.recipients,
    });
  }

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
      recipients: body.recipients ?? '',
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
    });
  }

  @RequirePermissions('notifications.manage')
  @Delete('drafts/:id')
  deleteDraft(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.deleteDraft(user.id, id);
  }

  @RequirePermissions('notifications.manage')
  @Post('drafts/:id/send')
  sendDraft(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() body: SendDraftDto) {
    return this.notificationsService.sendDraft(user.id, id, body.recipients);
  }

  @RequirePermissions('notifications.read')
  @Get(':id')
  getDetail(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.getMyNotificationDetail(user.id, id);
  }

  @RequirePermissions('notifications.manage')
  @Patch(':id/seen')
  markAsSeen(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.markAsSeen(user.id, id);
  }

  @RequirePermissions('notifications.manage')
  @Patch(':id/read')
  markAsRead(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.markAsRead(user.id, id);
  }

  @RequirePermissions('notifications.manage')
  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: { id: string }) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @RequirePermissions('notifications.manage')
  @Patch(':id/archive')
  archive(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.archive(user.id, id);
  }

  @RequirePermissions('notifications.manage')
  @Post('dev/send-to-me')
  sendDevToMe(@CurrentUser() user: { id: string }) {
    return this.notificationsService.createDevNotificationForUser(user.id);
  }
}
