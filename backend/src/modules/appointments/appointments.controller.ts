import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  AppointmentsService,
  APPOINTMENT_STATUSES,
  APPOINTMENT_MODES,
} from './appointments.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants';

const APPOINTMENT_ROLES = [
  ROLES.ORGANIZATION_OWNER,
  ROLES.PRINCIPAL,
  ROLES.RECEPTION,
  ROLES.TEACHER,
  ROLES.ACCOUNTANT,
  ROLES.HR,
  ROLES.LIBRARIAN,
  ROLES.TRANSPORT_MANAGER,
  ROLES.HOSTEL_MANAGER,
  ROLES.PARENT,
];

@ApiTags('Appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get('meta')
  @Roles(...APPOINTMENT_ROLES)
  @ApiOperation({ summary: 'Appointment metadata (statuses, modes)' })
  meta() {
    return {
      success: true,
      data: {
        statuses: APPOINTMENT_STATUSES,
        modes: APPOINTMENT_MODES,
      },
    };
  }

  @Post()
  @Roles(...APPOINTMENT_ROLES)
  @ApiOperation({ summary: 'Create an appointment' })
  async create(@Req() req: Request, @Body() dto: any) {
    const user = req.user as any;
    const appointment = await this.appointmentsService.create(
      user.tenantId,
      user.branchId,
      user,
      dto,
    );
    return { success: true, data: appointment };
  }

  @Get()
  @Roles(...APPOINTMENT_ROLES)
  @ApiOperation({ summary: 'List appointments (branch calendar)' })
  async list(
    @Req() req: Request,
    @Query('branchId') branchId?: string,
  ) {
    const user = req.user as any;
    const appointments = await this.appointmentsService.list(
      user.tenantId,
      branchId ?? user.branchId,
      user,
    );
    return { success: true, data: appointments };
  }

  @Get('count/upcoming')
  @Roles(...APPOINTMENT_ROLES)
  @ApiOperation({ summary: 'Count upcoming appointments for the user' })
  async countUpcoming(@Req() req: Request) {
    const user = req.user as any;
    const count = await this.appointmentsService.countUpcoming(
      user.tenantId,
      user,
    );
    return { success: true, data: count };
  }

  @Get(':id')
  @Roles(...APPOINTMENT_ROLES)
  @ApiOperation({ summary: 'Get appointment by ID' })
  async getOne(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    const appointment = await this.appointmentsService.getOne(
      user.tenantId,
      user,
      id,
    );
    return { success: true, data: appointment };
  }

  @Patch(':id')
  @Roles(...APPOINTMENT_ROLES)
  @ApiOperation({ summary: 'Update an appointment' })
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    const user = req.user as any;
    const appointment = await this.appointmentsService.update(
      user.tenantId,
      user,
      id,
      dto,
    );
    return { success: true, data: appointment };
  }

  @Patch(':id/status')
  @HttpCode(200)
  @Roles(...APPOINTMENT_ROLES)
  @ApiOperation({ summary: 'Change appointment status' })
  async setStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: { status: string; reason?: string },
  ) {
    const user = req.user as any;
    const appointment = await this.appointmentsService.setStatus(
      user.tenantId,
      user,
      id,
      dto.status,
      dto.reason,
    );
    return { success: true, data: appointment };
  }

  @Delete(':id')
  @Roles(...APPOINTMENT_ROLES)
  @ApiOperation({ summary: 'Delete an appointment (soft)' })
  async remove(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    const result = await this.appointmentsService.remove(
      user.tenantId,
      user,
      id,
    );
    return { success: true, data: result };
  }
}
