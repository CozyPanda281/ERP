import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AcademicService } from './academic.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ROLES } from '../../common/constants';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { SetCurrentAcademicYearDto } from './dto/set-current-academic-year.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';

@ApiTags('Academic')
@ApiBearerAuth()
@Controller()
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  @Post('academic-years')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL, ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create academic year' })
  async createAcademicYear(@CurrentUser() user: any, @Body() dto: CreateAcademicYearDto) {
    const data = await this.academicService.createAcademicYear({ ...dto, tenantId: user.tenantId });
    return { success: true, data };
  }

  @Get('branches/:branchId/academic-years')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL, ROLES.TEACHER)
  @ApiOperation({ summary: 'List academic years for a branch' })
  async getAcademicYears(@Param('branchId') branchId: string) {
    const data = await this.academicService.findAcademicYearsByBranch(branchId);
    return { success: true, data };
  }

  @Put('academic-years/:id/set-current')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Set current academic year' })
  async setCurrentAcademicYear(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: SetCurrentAcademicYearDto) {
    const data = await this.academicService.setCurrentAcademicYear(id, user.tenantId, dto.branchId);
    return { success: true, data };
  }

  @Post('departments')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Create department' })
  async createDepartment(@CurrentUser() user: any, @Body() dto: CreateDepartmentDto) {
    const data = await this.academicService.createDepartment({ ...dto, tenantId: user.tenantId });
    return { success: true, data };
  }

  @Get('branches/:branchId/departments')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL, ROLES.HR)
  @ApiOperation({ summary: 'List departments for a branch' })
  async getDepartments(@Param('branchId') branchId: string) {
    const data = await this.academicService.findDepartmentsByBranch(branchId);
    return { success: true, data };
  }

  @Put('departments/:id')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Update department' })
  async updateDepartment(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    const data = await this.academicService.updateDepartment(id, dto);
    return { success: true, data };
  }

  @Delete('departments/:id')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Delete department' })
  async deleteDepartment(@Param('id') id: string) {
    await this.academicService.deleteDepartment(id);
    return { success: true, message: 'Department deleted' };
  }

  @Post('classes')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Create class' })
  async createClass(@CurrentUser() user: any, @Body() dto: CreateClassDto) {
    const data = await this.academicService.createClass({ ...dto, tenantId: user.tenantId });
    return { success: true, data };
  }

  @Get('branches/:branchId/classes')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.STUDENT)
  @ApiOperation({ summary: 'List classes for a branch' })
  async getClasses(@Param('branchId') branchId: string) {
    const data = await this.academicService.findClassesByBranch(branchId);
    return { success: true, data };
  }

  @Put('classes/:id')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Update class' })
  async updateClass(@Param('id') id: string, @Body() dto: UpdateClassDto) {
    const data = await this.academicService.updateClass(id, dto);
    return { success: true, data };
  }

  @Delete('classes/:id')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Delete class' })
  async deleteClass(@Param('id') id: string) {
    await this.academicService.deleteClass(id);
    return { success: true, message: 'Class deleted' };
  }

  @Post('sections')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Create section' })
  async createSection(@CurrentUser() user: any, @Body() dto: CreateSectionDto) {
    const data = await this.academicService.createSection({ ...dto, tenantId: user.tenantId });
    return { success: true, data };
  }

  @Get('classes/:classId/sections')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL, ROLES.TEACHER)
  @ApiOperation({ summary: 'List sections for a class' })
  async getSections(@Param('classId') classId: string) {
    const data = await this.academicService.findSectionsByClass(classId);
    return { success: true, data };
  }

  @Post('subjects')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Create subject' })
  async createSubject(@CurrentUser() user: any, @Body() dto: CreateSubjectDto) {
    const data = await this.academicService.createSubject({ ...dto, tenantId: user.tenantId });
    return { success: true, data };
  }

  @Get('branches/:branchId/subjects')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL, ROLES.TEACHER)
  @ApiOperation({ summary: 'List subjects for a branch' })
  async getSubjects(@Param('branchId') branchId: string) {
    const data = await this.academicService.findSubjectsByBranch(branchId);
    return { success: true, data };
  }
}
