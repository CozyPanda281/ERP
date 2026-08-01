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

  @Get('teacher')
  @Roles(ROLES.TEACHER)
  @ApiOperation({
    summary: 'Teacher portal: my classes, today schedule, homework, exams',
  })
  async teacher(@Req() req: Request) {
    const user = req.user as any;
    const data = await this.dashboardService.teacherOverview({
      tenantId: user.tenantId,
      branchId: user.branchId,
      userId: user.sub,
    });
    return { success: true, data };
  }

  @Get('student')
  @Roles(ROLES.STUDENT)
  @ApiOperation({
    summary: 'Student portal: my enrollment, attendance, fees, results, homework',
  })
  async student(@Req() req: Request) {
    const user = req.user as any;
    const data = await this.dashboardService.studentOverview({
      tenantId: user.tenantId,
      branchId: user.branchId,
      userId: user.sub,
      email: user.email,
    });
    return { success: true, data };
  }

  @Get('parent')
  @Roles(ROLES.PARENT)
  @ApiOperation({
    summary: 'Parent portal: linked children, attendance, fees',
  })
  async parent(@Req() req: Request) {
    const user = req.user as any;
    const data = await this.dashboardService.parentOverview({
      tenantId: user.tenantId,
      branchId: user.branchId,
      email: user.email,
    });
    return { success: true, data };
  }

  @Get('accountant')
  @Roles(ROLES.ACCOUNTANT)
  @ApiOperation({
    summary: 'Accountant portal: collections, expenses, income, invoices, dues',
  })
  async accountant(@Req() req: Request) {
    const user = req.user as any;
    const data = await this.dashboardService.accountantOverview({
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }

  @Get('hr')
  @Roles(ROLES.HR)
  @ApiOperation({
    summary: 'HR portal: staff stats, leave requests, recruitment',
  })
  async hr(@Req() req: Request) {
    const user = req.user as any;
    const data = await this.dashboardService.hrOverview({
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }

  @Get('reception')
  @Roles(ROLES.RECEPTION)
  @ApiOperation({
    summary: 'Reception portal: visitors, enquiries, applications, notices',
  })
  async reception(@Req() req: Request) {
    const user = req.user as any;
    const data = await this.dashboardService.receptionOverview({
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }

  @Get('librarian')
  @Roles(ROLES.LIBRARIAN)
  @ApiOperation({
    summary: 'Librarian portal: books, members, issues, overdue',
  })
  async librarian(@Req() req: Request) {
    const user = req.user as any;
    const data = await this.dashboardService.librarianOverview({
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }

  @Get('transport')
  @Roles(ROLES.TRANSPORT_MANAGER)
  @ApiOperation({
    summary: 'Transport portal: vehicles, routes, assignments, fuel, maintenance',
  })
  async transport(@Req() req: Request) {
    const user = req.user as any;
    const data = await this.dashboardService.transportOverview({
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }

  @Get('hostel')
  @Roles(ROLES.HOSTEL_MANAGER)
  @ApiOperation({
    summary: 'Hostel portal: hostels, rooms, allocations, attendance',
  })
  async hostel(@Req() req: Request) {
    const user = req.user as any;
    const data = await this.dashboardService.hostelOverview({
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }
}
