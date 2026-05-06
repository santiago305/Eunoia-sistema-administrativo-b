import { Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/access-control/adapters/in/guards/permissions.guard';
import { RequirePermissions } from 'src/modules/access-control/adapters/in/decorators/require-permissions.decorator';
import { User as CurrentUser } from 'src/shared/utilidades/decorators/user.decorator';
import { NotificationsService } from 'src/modules/notifications/application/use-cases/notifications.service';
import { ListNotificationsQueryDto } from '../dtos/list-notifications.query';

@Controller('notifications')
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
