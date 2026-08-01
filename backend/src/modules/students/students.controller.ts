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
import { StudentsService } from './students.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ROLES } from '../../common/constants';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { UpdateEnquiryDto } from './dto/update-enquiry.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { LinkParentDto } from './dto/link-parent.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { CreateAcademicRecordDto } from './dto/create-academic-record.dto';
import { ListEnquiriesQueryDto } from './dto/list-enquiries-query.dto';
import { ListApplicationsQueryDto } from './dto/list-applications-query.dto';
import { ListStudentsQueryDto } from './dto/list-students-query.dto';
import { CreateParentDto } from './dto/create-parent.dto';
import { WithdrawStudentDto } from './dto/withdraw-student.dto';
import { PromoteStudentDto } from './dto/promote-student.dto';
import { AuditLog } from '../../common/decorators/audit-log.decorator';

@ApiTags('Students')
@ApiBearerAuth()
@Controller()
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  // â”€â”€â”€ Enquiries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @AuditLog({ action: 'post_enquiries', module: 'students' })
  @Post('enquiries')
  @Roles(ROLES.RECEPTION, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create enquiry' })
  async createEnquiry(@CurrentUser() user: any, @Body() dto: CreateEnquiryDto) {
    const data = await this.studentsService.createEnquiry({
      ...dto,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }

  @Get('branches/:branchId/enquiries')
  @Roles(ROLES.RECEPTION, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List enquiries for a branch' })
  async findEnquiries(
    @Param('branchId') branchId: string,
    @Query() query: ListEnquiriesQueryDto,
  ) {
    const data = await this.studentsService.findEnquiriesByBranch(
      branchId,
      query,
    );
    return { success: true, ...data };
  }

  @Get('enquiries/:id')
  @Roles(ROLES.RECEPTION, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Get enquiry by ID' })
  async findEnquiryById(@Param('id') id: string) {
    const data = await this.studentsService.findEnquiryById(id);
    return { success: true, data };
  }

  @AuditLog({
    action: 'put_enquiries_id',
    module: 'students',
    resourceIdParam: 'id',
  })
  @Put('enquiries/:id')
  @Roles(ROLES.RECEPTION, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Update enquiry' })
  async updateEnquiry(@Param('id') id: string, @Body() dto: UpdateEnquiryDto) {
    const data = await this.studentsService.updateEnquiry(id, dto);
    return { success: true, data };
  }

  @AuditLog({
    action: 'post_enquiries_id_convert',
    module: 'students',
    resourceIdParam: 'id',
  })
  @Post('enquiries/:id/convert')
  @Roles(ROLES.RECEPTION, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Convert enquiry to application' })
  async convertEnquiry(@Param('id') id: string) {
    const data = await this.studentsService.convertEnquiryToApplication(id);
    return { success: true, data };
  }

  // â”€â”€â”€ Applications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @AuditLog({ action: 'post_applications', module: 'students' })
  @Post('applications')
  @Roles(ROLES.RECEPTION, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Submit application' })
  async createApplication(
    @CurrentUser() user: any,
    @Body() dto: CreateApplicationDto,
  ) {
    const data = await this.studentsService.createApplication({
      ...dto,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }

  @Get('branches/:branchId/applications')
  @Roles(ROLES.RECEPTION, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List applications for a branch' })
  async findApplications(
    @Param('branchId') branchId: string,
    @Query() query: ListApplicationsQueryDto,
  ) {
    const data = await this.studentsService.findApplicationsByBranch(
      branchId,
      query,
    );
    return { success: true, ...data };
  }

  @Get('applications/:id')
  @Roles(ROLES.RECEPTION, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Get application by ID' })
  async findApplicationById(@Param('id') id: string) {
    const data = await this.studentsService.findApplicationById(id);
    return { success: true, data };
  }

  @AuditLog({
    action: 'put_applications_id',
    module: 'students',
    resourceIdParam: 'id',
  })
  @Put('applications/:id')
  @Roles(ROLES.RECEPTION, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Update application' })
  async updateApplication(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationDto,
  ) {
    const data = await this.studentsService.updateApplication(id, dto);
    return { success: true, data };
  }

  @AuditLog({
    action: 'post_applications_id_review',
    module: 'students',
    resourceIdParam: 'id',
  })
  @Post('applications/:id/review')
  @Roles(ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Review application' })
  async reviewApplication(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ReviewApplicationDto,
  ) {
    const data = await this.studentsService.reviewApplication(
      id,
      dto.status,
      dto.reviewRemarks,
      user.id,
    );
    return { success: true, data };
  }

  @AuditLog({
    action: 'post_applications_id_admit',
    module: 'students',
    resourceIdParam: 'id',
  })
  @Post('applications/:id/admit')
  @Roles(ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Admit application as student' })
  async admitApplication(@Param('id') id: string) {
    const data = await this.studentsService.admitApplication(id);
    return { success: true, data };
  }

  // â”€â”€â”€ Students â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @AuditLog({ action: 'post_students', module: 'students' })
  @Post('students')
  @Roles(ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create student directly' })
  async createStudent(@CurrentUser() user: any, @Body() dto: CreateStudentDto) {
    const data = await this.studentsService.createStudent({
      ...dto,
      tenantId: user.tenantId,
      branchId: user.branchId || user.tenantId,
    });
    return { success: true, data };
  }

  @Get('branches/:branchId/students')
  @Roles(ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List students for a branch' })
  async findStudents(
    @Param('branchId') branchId: string,
    @Query() query: ListStudentsQueryDto,
  ) {
    const data = await this.studentsService.findStudentsByBranch(
      branchId,
      query,
    );
    return { success: true, ...data };
  }

  @Get('students/:id')
  @Roles(ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Get student by ID' })
  async findStudentById(@Param('id') id: string) {
    const data = await this.studentsService.findStudentById(id);
    return { success: true, data };
  }

  @AuditLog({
    action: 'put_students_id',
    module: 'students',
    resourceIdParam: 'id',
  })
  @Put('students/:id')
  @Roles(ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Update student' })
  async updateStudent(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    const data = await this.studentsService.updateStudent(id, dto);
    return { success: true, data };
  }

  @AuditLog({
    action: 'post_students_id_withdraw',
    module: 'students',
    resourceIdParam: 'id',
  })
  @Post('students/:id/withdraw')
  @Roles(ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Withdraw student' })
  async withdrawStudent(
    @Param('id') id: string,
    @Body() dto: WithdrawStudentDto,
  ) {
    const data = await this.studentsService.withdrawStudent(
      id,
      dto.leavingDate,
      dto.leavingReason,
    );
    return { success: true, data };
  }

  @Get('students/:id/documents')
  @Roles(ROLES.PRINCIPAL, ROLES.TEACHER)
  @ApiOperation({ summary: 'Get student documents' })
  async getStudentDocuments(@Param('id') id: string) {
    const data = await this.studentsService.getStudentDocuments(id);
    return { success: true, data };
  }

  @Get('students/:id/academic-records')
  @Roles(ROLES.PRINCIPAL, ROLES.TEACHER)
  @ApiOperation({ summary: 'Get student academic records' })
  async getStudentAcademicRecords(@Param('id') id: string) {
    const data = await this.studentsService.getStudentAcademicRecords(id);
    return { success: true, data };
  }

  // â”€â”€â”€ Parents â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @AuditLog({ action: 'post_parents', module: 'students' })
  @Post('parents')
  @Roles(ROLES.PRINCIPAL, ROLES.RECEPTION)
  @ApiOperation({ summary: 'Create parent' })
  async createParent(@CurrentUser() user: any, @Body() dto: CreateParentDto) {
    const data = await this.studentsService.createParent({
      ...dto,
      tenantId: user.tenantId,
    });
    return { success: true, data };
  }

  @Get('parents/:id')
  @Roles(ROLES.PRINCIPAL, ROLES.TEACHER)
  @ApiOperation({ summary: 'Get parent by ID' })
  async findParentById(@Param('id') id: string) {
    const data = await this.studentsService.findParentById(id);
    return { success: true, data };
  }

  @AuditLog({
    action: 'put_parents_id',
    module: 'students',
    resourceIdParam: 'id',
  })
  @Put('parents/:id')
  @Roles(ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Update parent' })
  async updateParent(@Param('id') id: string, @Body() dto: CreateParentDto) {
    const data = await this.studentsService.updateParent(id, dto);
    return { success: true, data };
  }

  @AuditLog({
    action: 'post_students_id_parents',
    module: 'students',
    resourceIdParam: 'id',
  })
  @Post('students/:id/parents')
  @Roles(ROLES.PRINCIPAL, ROLES.RECEPTION)
  @ApiOperation({ summary: 'Link parent to student' })
  async linkParent(
    @CurrentUser() user: any,
    @Param('id') studentId: string,
    @Body() dto: LinkParentDto,
  ) {
    const data = await this.studentsService.linkParentToStudent(
      studentId,
      dto.parentId,
      dto.relationship,
      dto.isPrimary,
      dto.isEmergencyContact,
      user.tenantId,
    );
    return { success: true, data };
  }

  @Get('students/:id/parents')
  @Roles(ROLES.PRINCIPAL, ROLES.TEACHER)
  @ApiOperation({ summary: 'Get student parents' })
  async getStudentParents(@Param('id') id: string) {
    const data = await this.studentsService.getStudentParents(id);
    return { success: true, data };
  }

  // â”€â”€â”€ Documents â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @AuditLog({
    action: 'post_students_id_documents',
    module: 'students',
    resourceIdParam: 'id',
  })
  @Post('students/:id/documents')
  @Roles(ROLES.PRINCIPAL, ROLES.RECEPTION)
  @ApiOperation({ summary: 'Add document to student' })
  async createDocument(
    @CurrentUser() user: any,
    @Param('id') studentId: string,
    @Body() dto: CreateDocumentDto,
  ) {
    const data = await this.studentsService.createDocument({
      ...dto,
      tenantId: user.tenantId,
      studentId,
    });
    return { success: true, data };
  }

  @AuditLog({
    action: 'put_documents_id',
    module: 'students',
    resourceIdParam: 'id',
  })
  @Put('documents/:id')
  @Roles(ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Update document' })
  async updateDocument(
    @Param('id') id: string,
    @Body() dto: CreateDocumentDto,
  ) {
    const data = await this.studentsService.updateDocument(id, dto);
    return { success: true, data };
  }

  @AuditLog({
    action: 'delete_documents_id',
    module: 'students',
    resourceIdParam: 'id',
  })
  @Delete('documents/:id')
  @Roles(ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Delete document' })
  async deleteDocument(@Param('id') id: string) {
    await this.studentsService.deleteDocument(id);
    return { success: true, message: 'Document deleted' };
  }

  // â”€â”€â”€ Academic Records â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @AuditLog({
    action: 'post_students_id_academic_records',
    module: 'students',
    resourceIdParam: 'id',
  })
  @Post('students/:id/academic-records')
  @Roles(ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create academic record' })
  async createAcademicRecord(
    @CurrentUser() user: any,
    @Param('id') studentId: string,
    @Body() dto: CreateAcademicRecordDto,
  ) {
    const data = await this.studentsService.createAcademicRecord({
      ...dto,
      tenantId: user.tenantId,
      branchId: user.branchId,
      studentId,
    });
    return { success: true, data };
  }

  @AuditLog({
    action: 'post_students_id_promote',
    module: 'students',
    resourceIdParam: 'id',
  })
  @Post('students/:id/promote')
  @Roles(ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Promote student to next class' })
  async promoteStudent(
    @Param('id') studentId: string,
    @Body() dto: PromoteStudentDto,
  ) {
    const data = await this.studentsService.promoteStudent(
      studentId,
      dto.classId,
      dto.academicYearId,
      dto.sectionId,
    );
    return { success: true, data };
  }
}
