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
import { ExamsService } from './exams.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ROLES } from '../../common/constants';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { BulkMarksDto } from './dto/enter-marks.dto';
import { UpdateMarkDto } from './dto/update-mark.dto';
import { ExamQueryDto, MarksQueryDto } from './dto/exam-query.dto';
import { AuditLog } from '../../common/decorators/audit-log.decorator';

@ApiTags('Exams')
@ApiBearerAuth()
@Controller()
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  // â”€â”€â”€ Exams â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @AuditLog({ action: 'post_exams', module: 'exams' })
  @Post('exams')
  @Roles(ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create exam' })
  async createExam(@CurrentUser() user: any, @Body() dto: CreateExamDto) {
    const data = await this.examsService.createExam({
      ...dto,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }

  @Get('exams')
  @Roles(ROLES.PRINCIPAL, ROLES.TEACHER)
  @ApiOperation({ summary: 'List exams' })
  async findExams(@CurrentUser() user: any, @Query() query: ExamQueryDto) {
    const data = await this.examsService.findExamsByBranch(
      user.branchId,
      query,
    );
    return { success: true, ...data };
  }

  @Get('exams/:id')
  @Roles(ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.STUDENT)
  @ApiOperation({ summary: 'Get exam by ID' })
  async findExam(@Param('id') id: string) {
    const data = await this.examsService.findExamById(id);
    return { success: true, data };
  }

  @AuditLog({ action: 'put_exams_id', module: 'exams', resourceIdParam: 'id' })
  @Put('exams/:id')
  @Roles(ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Update exam' })
  async updateExam(@Param('id') id: string, @Body() dto: UpdateExamDto) {
    const data = await this.examsService.updateExam(id, dto);
    return { success: true, data };
  }

  @AuditLog({
    action: 'delete_exams_id',
    module: 'exams',
    resourceIdParam: 'id',
  })
  @Delete('exams/:id')
  @Roles(ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Delete exam' })
  async deleteExam(@Param('id') id: string) {
    await this.examsService.deleteExam(id);
    return { success: true, message: 'Exam deleted' };
  }

  // â”€â”€â”€ Schedules â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @AuditLog({
    action: 'post_exams_examId_schedules',
    module: 'exams',
    resourceIdParam: 'id',
  })
  @Post('exams/:examId/schedules')
  @Roles(ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Create exam schedule' })
  async createSchedule(
    @Param('examId') examId: string,
    @Body() dto: CreateScheduleDto,
  ) {
    const data = await this.examsService.createSchedule(examId, dto);
    return { success: true, data };
  }

  @Get('exams/:examId/schedules')
  @Roles(ROLES.PRINCIPAL, ROLES.TEACHER)
  @ApiOperation({ summary: 'List schedules for exam' })
  async findSchedules(@Param('examId') examId: string) {
    const data = await this.examsService.findSchedulesByExam(examId);
    return { success: true, data };
  }

  @AuditLog({
    action: 'put_exam_schedules_id',
    module: 'exams',
    resourceIdParam: 'id',
  })
  @Put('exam-schedules/:id')
  @Roles(ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Update exam schedule' })
  async updateSchedule(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    const data = await this.examsService.updateSchedule(id, dto);
    return { success: true, data };
  }

  @AuditLog({
    action: 'delete_exam_schedules_id',
    module: 'exams',
    resourceIdParam: 'id',
  })
  @Delete('exam-schedules/:id')
  @Roles(ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Delete exam schedule' })
  async deleteSchedule(@Param('id') id: string) {
    await this.examsService.deleteSchedule(id);
    return { success: true, message: 'Schedule deleted' };
  }

  // â”€â”€â”€ Marks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @AuditLog({ action: 'post_exam_marks_bulk', module: 'exams' })
  @Post('exam-marks/bulk')
  @Roles(ROLES.TEACHER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Bulk enter marks for a schedule' })
  async bulkEnterMarks(@CurrentUser() user: any, @Body() dto: BulkMarksDto) {
    const data = await this.examsService.bulkEnterMarks({
      tenantId: user.tenantId,
      branchId: user.branchId,
      enteredBy: user.id,
      examScheduleId: dto.examScheduleId,
      marks: dto.marks,
    });
    return { success: true, data };
  }

  @Get('exam-marks/schedule/:scheduleId')
  @Roles(ROLES.TEACHER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Get marks for a schedule' })
  async findMarksBySchedule(
    @Param('scheduleId') scheduleId: string,
    @Query() query: MarksQueryDto,
  ) {
    const data = await this.examsService.findMarksBySchedule(scheduleId, query);
    return { success: true, ...data };
  }

  @Get('exam-marks/student/:studentId')
  @Roles(ROLES.TEACHER, ROLES.PRINCIPAL, ROLES.STUDENT)
  @ApiOperation({ summary: 'Get marks for a student' })
  async findMarksByStudent(
    @Param('studentId') studentId: string,
    @CurrentUser() user: any,
    @Query() query: MarksQueryDto,
  ) {
    const data = await this.examsService.findMarksByStudent(
      studentId,
      user.branchId,
      query,
    );
    return { success: true, ...data };
  }

  @AuditLog({
    action: 'put_exam_marks_id',
    module: 'exams',
    resourceIdParam: 'id',
  })
  @Put('exam-marks/:id')
  @Roles(ROLES.TEACHER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Update a mark entry' })
  async updateMark(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: UpdateMarkDto,
  ) {
    const data = await this.examsService.updateMark(id, user.branchId, body);
    return { success: true, data };
  }

  // â”€â”€â”€ Results â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @AuditLog({
    action: 'post_exams_examId_generate_results',
    module: 'exams',
    resourceIdParam: 'id',
  })
  @Post('exams/:examId/generate-results')
  @Roles(ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Generate exam results' })
  async generateResults(@Param('examId') examId: string) {
    const data = await this.examsService.generateResults(examId);
    return { success: true, data };
  }

  @Get('exams/:examId/results')
  @Roles(ROLES.PRINCIPAL, ROLES.TEACHER)
  @ApiOperation({ summary: 'Get exam results with rankings' })
  async findResultsByExam(@Param('examId') examId: string) {
    const data = await this.examsService.findResultsByExam(examId);
    return { success: true, data };
  }

  @Get('exams/:examId/results/:studentId')
  @Roles(ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.STUDENT)
  @ApiOperation({
    summary: 'Get student result for exam with subject breakdown',
  })
  async findResultByStudent(
    @Param('examId') examId: string,
    @Param('studentId') studentId: string,
  ) {
    const data = await this.examsService.findResultByStudent(studentId, examId);
    return { success: true, data };
  }

  @Get('student-results/:studentId')
  @Roles(ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.STUDENT)
  @ApiOperation({ summary: 'Get all results for a student across exams' })
  async findResultsByStudent(
    @Param('studentId') studentId: string,
    @CurrentUser() user: any,
    @Query() query: ExamQueryDto,
  ) {
    const data = await this.examsService.findResultsByStudent(
      studentId,
      user.branchId,
      query,
    );
    return { success: true, ...data };
  }

  @Get('exams/:examId/subject-marks/:studentId')
  @Roles(ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.STUDENT)
  @ApiOperation({ summary: 'Get subject-wise marks for a student in an exam' })
  async getSubjectMarks(
    @Param('examId') examId: string,
    @Param('studentId') studentId: string,
  ) {
    const data = await this.examsService.getSubjectMarks(examId, studentId);
    return { success: true, data };
  }
}
