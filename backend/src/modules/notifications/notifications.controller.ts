import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ROLES } from '../../common/constants';
import { CreateTemplateDto } from './dto/create-template.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { CreateCircularDto } from './dto/create-circular.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Post('templates')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create notification template' })
  async createTemplate(
    @Body() body: CreateTemplateDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.createTemplate({
      ...body,
      tenantId: user.tenantId,
    });
    return { success: true, data };
  }

  @Get('templates')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List templates' })
  async getTemplates(@CurrentUser() user: any) {
    const data = await this.service.findTemplatesByTenant(user.tenantId);
    return { success: true, data };
  }

  @Post('send')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Send notification' })
  async sendNotification(
    @Body() body: SendNotificationDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.sendNotification({
      ...body,
      tenantId: user.tenantId,
      senderId: user.id,
    });
    return { success: true, data };
  }

  @Get()
  @Roles(ROLES.SUPER_ADMIN, ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'List notifications' })
  async getNotifications(
    @CurrentUser() user: any,
    @Query() query: NotificationQueryDto,
  ) {
    const data = await this.service.findNotificationsByTenant(
      user.tenantId,
      query,
    );
    return { success: true, ...data };
  }

  @Post('announcements')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create announcement' })
  async createAnnouncement(
    @Body() body: CreateAnnouncementDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.createAnnouncement({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
      createdBy: user.id,
    });
    return { success: true, data };
  }

  @Get('announcements')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List announcements' })
  async getAnnouncements(
    @CurrentUser() user: any,
    @Query() query: NotificationQueryDto,
  ) {
    const data = await this.service.findAnnouncementsByBranch(
      user.branchId,
      query,
    );
    return { success: true, ...data };
  }

  @Post('circulars')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create circular' })
  async createCircular(
    @Body() body: CreateCircularDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.createCircular({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
      createdBy: user.id,
    });
    return { success: true, data };
  }

  @Get('circulars')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List circulars' })
  async getCirculars(
    @CurrentUser() user: any,
    @Query() query: NotificationQueryDto,
  ) {
    const data = await this.service.findCircularsByBranch(user.branchId, query);
    return { success: true, ...data };
  }
}
