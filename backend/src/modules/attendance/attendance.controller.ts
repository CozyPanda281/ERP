import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { ROLES } from '../../common/constants';
import { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import {
  AttendanceQueryDto,
  AttendanceSummaryQueryDto,
} from './dto/attendance-query.dto';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller()
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @AuditLog({
    action: 'post_attendance_sessions',
    module: 'attendance',
    includeBody: true,
  })
  @Post('attendance/sessions')
  @Roles(ROLES.TEACHER, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create attendance session with records' })
  async createSession(
    @CurrentUser() user: any,
    @Body() dto: CreateAttendanceSessionDto,
  ) {
    const data = await this.attendanceService.createSession({
      tenantId: user.tenantId,
      branchId: user.branchId,
      createdBy: user.id,
      timetableEntryId: dto.timetableEntryId,
      date: dto.date,
      records: dto.records,
    });
    return { success: true, data };
  }

  @Get('attendance/sessions/:id')
  @Roles(
    ROLES.TEACHER,
    ROLES.PRINCIPAL,
    ROLES.STUDENT,
    ROLES.ORGANIZATION_OWNER,
  )
  @ApiOperation({ summary: 'Get attendance session with records' })
  async getSession(@Param('id') id: string, @CurrentUser() user: any) {
    const data = await this.attendanceService.getSessionById(id, user.branchId);
    return { success: true, data };
  }

  @AuditLog({
    action: 'put_attendance_records',
    module: 'attendance',
    resourceIdParam: 'id',
    includeBody: true,
  })
  @Put('attendance/records/:id')
  @Roles(ROLES.TEACHER, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Update single attendance record' })
  async updateRecord(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateAttendanceDto,
  ) {
    const data = await this.attendanceService.updateRecord(
      id,
      user.branchId,
      dto,
    );
    return { success: true, data };
  }

  @Get('attendance')
  @Roles(ROLES.TEACHER, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List attendance sessions' })
  async findByBranch(
    @CurrentUser() user: any,
    @Query() query: AttendanceQueryDto,
  ) {
    const data = await this.attendanceService.findByBranch(
      user.branchId,
      query,
    );
    return { success: true, ...data };
  }

  @Get('attendance/student/:studentId')
  @Roles(ROLES.TEACHER, ROLES.PRINCIPAL, ROLES.STUDENT)
  @ApiOperation({ summary: 'Get student attendance records' })
  async findByStudent(
    @Param('studentId') studentId: string,
    @CurrentUser() user: any,
    @Query() query: AttendanceQueryDto,
  ) {
    return this.attendanceService.findByStudent(
      studentId,
      user.branchId,
      query,
    );
  }

  @Get('attendance/student/:studentId/summary')
  @Roles(ROLES.TEACHER, ROLES.PRINCIPAL, ROLES.STUDENT)
  @ApiOperation({ summary: 'Get student attendance summary' })
  async getSummary(
    @Param('studentId') studentId: string,
    @CurrentUser() user: any,
    @Query() query: AttendanceSummaryQueryDto,
  ) {
    const data = await this.attendanceService.getSummary(
      studentId,
      user.branchId,
      query,
    );
    return { success: true, data };
  }

  @Get('attendance/reports/daily')
  @Roles(ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Get daily attendance report' })
  async getDailyReport(@CurrentUser() user: any, @Query('date') date: string) {
    const data = await this.attendanceService.getDailyReport(
      user.branchId,
      date,
    );
    return { success: true, data };
  }
}
