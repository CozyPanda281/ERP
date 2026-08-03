import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VisitorsService } from './visitors.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { ROLES } from '../../common/constants';
import { CheckInDto } from './dto/check-in.dto';
import { VisitorQueryDto } from './dto/visitor-query.dto';
import { AuditLog } from '../../common/decorators/audit-log.decorator';

@ApiTags('Visitors')
@ApiBearerAuth()
@RequiresFeature('reception')
@Controller('visitors')
export class VisitorsController {
  constructor(private readonly service: VisitorsService) {}

  @AuditLog({ action: 'post_check_in', module: 'visitors' })
  @Post('check-in')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER, ROLES.RECEPTION)
  @ApiOperation({ summary: 'Check in a visitor' })
  async checkIn(@Body() body: CheckInDto, @CurrentUser() user: any) {
    const data = await this.service.checkIn({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }

  @Get()
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER, ROLES.RECEPTION)
  @ApiOperation({ summary: 'List visitors' })
  async findAll(@CurrentUser() user: any, @Query() query: VisitorQueryDto) {
    const data = await this.service.findByBranch(user.branchId, query);
    return { success: true, ...data };
  }

  @Get(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER, ROLES.RECEPTION)
  @ApiOperation({ summary: 'Get visitor by ID' })
  async findById(@Param('id') id: string) {
    const data = await this.service.findById(id);
    return { success: true, data };
  }

  @AuditLog({
    action: 'put_id_check_out',
    module: 'visitors',
    resourceIdParam: 'id',
  })
  @Put(':id/check-out')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER, ROLES.RECEPTION)
  @ApiOperation({ summary: 'Check out a visitor' })
  async checkOut(@Param('id') id: string) {
    const data = await this.service.checkOut(id);
    return { success: true, data };
  }
}
