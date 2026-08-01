import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { DashboardService } from './dashboard.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({
    summary: 'Dashboard overview for Owner/Principal (counts, fees, attendance)',
  })
  async overview(@Req() req: Request) {
    const user = req.user as any;
    const data = await this.dashboardService.overview({
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }
}
