import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommunicationService } from './communication.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from './dto/create-announcement.dto';
import {
  NotificationQueryDto,
  AnnouncementQueryDto,
} from './dto/communication-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ROLES } from '../../common/constants';

@ApiTags('Communication')
@ApiBearerAuth()
@Controller('communication')
export class CommunicationController {
  constructor(private readonly service: CommunicationService) {}

  @Post('templates')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create notification template' })
  async createTemplate(
    @Body() body: CreateTemplateDto,
    @CurrentUser() user: any,
  ) {
    return this.service.createTemplate({ ...body, tenantId: user.tenantId });
  }

  @Get('templates')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List notification templates' })
  async findTemplates(@CurrentUser() user: any) {
    return this.service.findTemplatesByTenant(user.tenantId);
  }

  @Put('templates/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Update notification template' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() body: UpdateTemplateDto,
    @CurrentUser() user: any,
  ) {
    return this.service.updateTemplate(id, user.tenantId, body);
  }

  @Delete('templates/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Delete notification template' })
  async deleteTemplate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.deleteTemplate(id, user.tenantId);
  }

  @Post('notifications')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER)
  @ApiOperation({ summary: 'Send notification' })
  async createNotification(
    @Body() body: CreateNotificationDto,
    @CurrentUser() user: any,
  ) {
    return this.service.createNotification({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
      senderId: user.id,
    });
  }

  @Get('notifications/mine')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.TEACHER,
    ROLES.STUDENT,
    ROLES.PARENT,
  )
  @ApiOperation({ summary: 'Get my notifications' })
  async getMyNotifications(
    @CurrentUser() user: any,
    @Query() query: NotificationQueryDto,
  ) {
    return this.service.findMyNotifications(user.id, user.branchId, query);
  }

  @Put('notifications/:id/read')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.TEACHER,
    ROLES.STUDENT,
    ROLES.PARENT,
  )
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.markAsRead(id, user.id);
  }

  @Put('notifications/read-all')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.TEACHER,
    ROLES.STUDENT,
    ROLES.PARENT,
  )
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser() user: any) {
    return this.service.markAllAsRead(user.id, user.branchId);
  }

  @Post('announcements')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create announcement' })
  async createAnnouncement(
    @Body() body: CreateAnnouncementDto,
    @CurrentUser() user: any,
  ) {
    return this.service.createAnnouncement({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
      createdBy: user.id,
    });
  }

  @Get('announcements')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.TEACHER,
    ROLES.STUDENT,
    ROLES.PARENT,
  )
  @ApiOperation({ summary: 'List announcements by branch' })
  async getAnnouncements(
    @CurrentUser() user: any,
    @Query() query: AnnouncementQueryDto,
  ) {
    return this.service.findAnnouncementsByBranch(user.branchId, query);
  }

  @Put('announcements/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Update announcement' })
  async updateAnnouncement(
    @Param('id') id: string,
    @Body() body: UpdateAnnouncementDto,
    @CurrentUser() user: any,
  ) {
    return this.service.updateAnnouncement(id, user.branchId, body);
  }

  @Delete('announcements/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Delete announcement' })
  async deleteAnnouncement(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.deleteAnnouncement(id, user.branchId);
  }
}
