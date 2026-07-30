import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit')
@Roles(ROLES.SUPER_ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Search audit logs (SuperAdmin)' })
  async find(
    @Query('tenantId') tenantId?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('module') module?: string,
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('outcome') outcome?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.auditService.find({
      tenantId,
      userId,
      action,
      module,
      resourceType,
      resourceId,
      outcome,
      startDate,
      endDate,
      page,
      limit,
    });
  }

  @Get('tenant/:tenantId')
  @ApiOperation({ summary: 'Get audit logs for a tenant' })
  async findByTenant(
    @Param('tenantId') tenantId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.auditService.findByTenant(tenantId, page, limit);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get audit logs for a user' })
  async findByUser(
    @Param('userId') userId: string,
    @Query('tenantId') tenantId?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.auditService.findByUser(userId, tenantId, page, limit);
  }

  @Get('resource/:resourceType/:resourceId')
  @ApiOperation({ summary: 'Get audit logs for a resource' })
  async findByResource(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.auditService.findByResource(resourceType, resourceId, page, limit);
  }

  @Get('stats/modules')
  @ApiOperation({ summary: 'Get audit stats by module' })
  async getModuleStats(@Query('tenantId') tenantId?: string) {
    const data = await this.auditService.getModuleStats(tenantId);
    return { success: true, data };
  }

  @Get('stats/daily')
  @ApiOperation({ summary: 'Get daily audit activity' })
  async getDailyStats(
    @Query('days') days: number = 30,
    @Query('tenantId') tenantId?: string,
  ) {
    const data = await this.auditService.getDailyStats(days, tenantId);
    return { success: true, data };
  }
}
