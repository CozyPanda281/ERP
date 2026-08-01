import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HomeworkService } from './homework.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { ROLES } from '../../common/constants';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { SubmitHomeworkDto } from './dto/submit-homework.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { HomeworkQueryDto } from './dto/homework-query.dto';
import { AuditLog } from '../../common/decorators/audit-log.decorator';

@ApiTags('Homework')
@ApiBearerAuth()
@Controller('homework')
export class HomeworkController {
  constructor(private readonly service: HomeworkService) {}

  @AuditLog({ action: 'post_root', module: 'homework' })
  @Post()
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create homework' })
  async createHomework(
    @Body() body: CreateHomeworkDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.createHomework({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }

  @Get()
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List homework' })
  async getHomework(
    @CurrentUser() user: any,
    @Query() query: HomeworkQueryDto,
  ) {
    const data = await this.service.findHomeworkByBranch(user.branchId, query);
    return { success: true, ...data };
  }

  @AuditLog({
    action: 'post_homeworkId_submissions',
    module: 'homework',
    resourceIdParam: 'id',
  })
  @Post(':homeworkId/submissions')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Submit homework' })
  async submitHomework(
    @Param('homeworkId') homeworkId: string,
    @Body() body: SubmitHomeworkDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.submitHomework({
      ...body,
      homeworkId,
      tenantId: user.tenantId,
    });
    return { success: true, data };
  }

  @Get(':homeworkId/submissions')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List submissions' })
  async getSubmissions(@Param('homeworkId') homeworkId: string) {
    const data = await this.service.findSubmissionsByHomework(homeworkId);
    return { success: true, data };
  }

  @AuditLog({
    action: 'put_submissions_id_grade',
    module: 'homework',
    resourceIdParam: 'id',
  })
  @Put('submissions/:id/grade')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Grade submission' })
  async gradeSubmission(
    @Param('id') id: string,
    @Body() body: GradeSubmissionDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.gradeSubmission(
      id,
      body.marksObtained,
      body.feedback,
      user.id,
    );
    return { success: true, data };
  }

  @AuditLog({ action: 'post_assignments', module: 'homework' })
  @Post('assignments')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @RequiresFeature('assignments')
  @ApiOperation({ summary: 'Create assignment' })
  async createAssignment(
    @Body() body: CreateAssignmentDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.createAssignment({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }

  @Get('assignments')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @RequiresFeature('assignments')
  @ApiOperation({ summary: 'List assignments' })
  async getAssignments(
    @CurrentUser() user: any,
    @Query() query: HomeworkQueryDto,
  ) {
    const data = await this.service.findAssignmentsByBranch(
      user.branchId,
      query,
    );
    return { success: true, ...data };
  }

  @AuditLog({
    action: 'post_assignments_assignmentId_submissions',
    module: 'homework',
    resourceIdParam: 'id',
  })
  @Post('assignments/:assignmentId/submissions')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @RequiresFeature('assignments')
  @ApiOperation({ summary: 'Submit assignment' })
  async submitAssignment(
    @Param('assignmentId') assignmentId: string,
    @Body() body: SubmitHomeworkDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.submitAssignment({
      ...body,
      assignmentId,
      tenantId: user.tenantId,
    });
    return { success: true, data };
  }

  @Get('assignments/:assignmentId/submissions')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @RequiresFeature('assignments')
  @ApiOperation({ summary: 'List assignment submissions' })
  async getAssignmentSubmissions(@Param('assignmentId') assignmentId: string) {
    const data = await this.service.findAssignmentSubmissions(assignmentId);
    return { success: true, data };
  }

  @AuditLog({
    action: 'put_assignments_submissions_id_grade',
    module: 'homework',
    resourceIdParam: 'id',
  })
  @Put('assignments/submissions/:id/grade')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @RequiresFeature('assignments')
  @ApiOperation({ summary: 'Grade assignment submission' })
  async gradeAssignmentSubmission(
    @Param('id') id: string,
    @Body() body: GradeSubmissionDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.gradeAssignmentSubmission(
      id,
      body.marksObtained,
      body.feedback,
      user.id,
    );
    return { success: true, data };
  }

  @Get(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Get homework by ID' })
  async getHomeworkById(@Param('id') id: string) {
    const data = await this.service.findHomeworkById(id);
    return { success: true, data };
  }
}
