import { Controller, Get, Header, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/access-control/adapters/in/guards/permissions.guard';
import { RequirePermissions } from 'src/modules/access-control/adapters/in/decorators/require-permissions.decorator';
import { User as CurrentUser } from 'src/shared/utilidades/decorators/user.decorator';
import { NotificationsService } from 'src/modules/mail/application/use-cases/notifications.service';
import { ListNotificationsQueryDto } from '../dtos/list-notifications.query';
import { MAIL_DEPRECATION } from 'src/modules/mail/application/constants/deprecation.constants';

@Controller('api/notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LegacyNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @RequirePermissions('notifications.read')
  @Get()
  @Header('Deprecation', 'true')
  @Header('Sunset', 'Thu, 31 Dec 2026 23:59:59 GMT')
  @Header('X-API-Legacy', MAIL_DEPRECATION.legacyApiVersion)
  @Header('X-API-Replacement', MAIL_DEPRECATION.replacementApiVersion)
  @Header('Link', `${MAIL_DEPRECATION.docsPath}; rel="deprecation"`)
  listMyNotifications(
    @CurrentUser() user: { id: string },
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationsService.listMyNotifications(user.id, query.limit, query.cursor);
  }

  @RequirePermissions('notifications.read')
  @Get('unread-count')
  @Header('Deprecation', 'true')
  @Header('Sunset', 'Thu, 31 Dec 2026 23:59:59 GMT')
  @Header('X-API-Legacy', MAIL_DEPRECATION.legacyApiVersion)
  @Header('X-API-Replacement', MAIL_DEPRECATION.replacementApiVersion)
  @Header('Link', `${MAIL_DEPRECATION.docsPath}; rel="deprecation"`)
  getUnreadCount(@CurrentUser() user: { id: string }) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @RequirePermissions('notifications.read')
  @Get(':id')
  @Header('Deprecation', 'true')
  @Header('Sunset', 'Thu, 31 Dec 2026 23:59:59 GMT')
  @Header('X-API-Legacy', MAIL_DEPRECATION.legacyApiVersion)
  @Header('X-API-Replacement', MAIL_DEPRECATION.replacementApiVersion)
  @Header('Link', `${MAIL_DEPRECATION.docsPath}; rel="deprecation"`)
  getDetail(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.getMyNotificationDetail(user.id, id);
  }

  @RequirePermissions('notifications.manage')
  @Patch(':id/seen')
  @Header('Deprecation', 'true')
  @Header('Sunset', 'Thu, 31 Dec 2026 23:59:59 GMT')
  @Header('X-API-Legacy', MAIL_DEPRECATION.legacyApiVersion)
  @Header('X-API-Replacement', MAIL_DEPRECATION.replacementApiVersion)
  @Header('Link', `${MAIL_DEPRECATION.docsPath}; rel="deprecation"`)
  markAsSeen(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.markAsSeen(user.id, id);
  }

  @RequirePermissions('notifications.manage')
  @Patch(':id/read')
  @Header('Deprecation', 'true')
  @Header('Sunset', 'Thu, 31 Dec 2026 23:59:59 GMT')
  @Header('X-API-Legacy', MAIL_DEPRECATION.legacyApiVersion)
  @Header('X-API-Replacement', MAIL_DEPRECATION.replacementApiVersion)
  @Header('Link', `${MAIL_DEPRECATION.docsPath}; rel="deprecation"`)
  markAsRead(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.markAsRead(user.id, id);
  }

  @RequirePermissions('notifications.manage')
  @Patch('read-all')
  @Header('Deprecation', 'true')
  @Header('Sunset', 'Thu, 31 Dec 2026 23:59:59 GMT')
  @Header('X-API-Legacy', MAIL_DEPRECATION.legacyApiVersion)
  @Header('X-API-Replacement', MAIL_DEPRECATION.replacementApiVersion)
  @Header('Link', `${MAIL_DEPRECATION.docsPath}; rel="deprecation"`)
  markAllAsRead(@CurrentUser() user: { id: string }) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @RequirePermissions('notifications.manage')
  @Patch(':id/archive')
  @Header('Deprecation', 'true')
  @Header('Sunset', 'Thu, 31 Dec 2026 23:59:59 GMT')
  @Header('X-API-Legacy', MAIL_DEPRECATION.legacyApiVersion)
  @Header('X-API-Replacement', MAIL_DEPRECATION.replacementApiVersion)
  @Header('Link', `${MAIL_DEPRECATION.docsPath}; rel="deprecation"`)
  archive(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.archive(user.id, id);
  }

  @RequirePermissions('notifications.manage')
  @Post('dev/send-to-me')
  @Header('Deprecation', 'true')
  @Header('Sunset', 'Thu, 31 Dec 2026 23:59:59 GMT')
  @Header('X-API-Legacy', MAIL_DEPRECATION.legacyApiVersion)
  @Header('X-API-Replacement', MAIL_DEPRECATION.replacementApiVersion)
  @Header('Link', `${MAIL_DEPRECATION.docsPath}; rel="deprecation"`)
  sendDevToMe(@CurrentUser() user: { id: string }) {
    return this.notificationsService.createDevNotificationForUser(user.id);
  }
}
