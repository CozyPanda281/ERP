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
import { TimetableService } from './timetable.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ROLES } from '../../common/constants';
import { CreateTimetableDto } from './dto/create-timetable.dto';
import { UpdateTimetableDto } from './dto/update-timetable.dto';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { BatchEntriesDto } from './dto/batch-entries.dto';
import { ListTimetablesQueryDto } from './dto/list-timetables-query.dto';
import { AuditLog } from '../../common/decorators/audit-log.decorator';

@ApiTags('Timetable')
@ApiBearerAuth()
@Controller()
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @AuditLog({ action: 'post_timetables', module: 'timetable' })
  @Post('timetables')
  @Roles(ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create timetable' })
  async create(@CurrentUser() user: any, @Body() dto: CreateTimetableDto) {
    const data = await this.timetableService.create({
      ...dto,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }

  @Get('branches/:branchId/timetables')
  @Roles(ROLES.PRINCIPAL, ROLES.TEACHER)
  @ApiOperation({ summary: 'List timetables for a branch' })
  async findByBranch(
    @Param('branchId') branchId: string,
    @Query() query: ListTimetablesQueryDto,
  ) {
    return this.timetableService.findByBranch(branchId, query);
  }

  @Get('timetables/:id')
  @Roles(ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.STUDENT)
  @ApiOperation({ summary: 'Get timetable with entries' })
  async findById(@Param('id') id: string) {
    const data = await this.timetableService.findById(id);
    return { success: true, data };
  }

  @AuditLog({
    action: 'put_timetables_id',
    module: 'timetable',
    resourceIdParam: 'id',
  })
  @Put('timetables/:id')
  @Roles(ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Update timetable' })
  async update(@Param('id') id: string, @Body() dto: UpdateTimetableDto) {
    const data = await this.timetableService.update(id, dto);
    return { success: true, data };
  }

  @AuditLog({
    action: 'delete_timetables_id',
    module: 'timetable',
    resourceIdParam: 'id',
  })
  @Delete('timetables/:id')
  @Roles(ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Delete timetable' })
  async remove(@Param('id') id: string) {
    await this.timetableService.softDelete(id);
    return { success: true, message: 'Timetable deleted' };
  }

  @AuditLog({
    action: 'post_timetables_id_activate',
    module: 'timetable',
    resourceIdParam: 'id',
  })
  @Post('timetables/:id/activate')
  @Roles(ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Set timetable as active for its class' })
  async setActive(@Param('id') id: string) {
    const data = await this.timetableService.setActive(id);
    return { success: true, data };
  }

  @AuditLog({
    action: 'post_timetables_id_entries',
    module: 'timetable',
    resourceIdParam: 'id',
  })
  @Post('timetables/:id/entries')
  @Roles(ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Add entry to timetable' })
  async addEntry(@Param('id') id: string, @Body() dto: CreateEntryDto) {
    const data = await this.timetableService.addEntry(id, dto);
    return { success: true, data };
  }

  @AuditLog({
    action: 'put_timetable_entries_id',
    module: 'timetable',
    resourceIdParam: 'id',
  })
  @Put('timetable-entries/:id')
  @Roles(ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Update timetable entry' })
  async updateEntry(@Param('id') id: string, @Body() dto: UpdateEntryDto) {
    const data = await this.timetableService.updateEntry(id, dto);
    return { success: true, data };
  }

  @AuditLog({
    action: 'delete_timetable_entries_id',
    module: 'timetable',
    resourceIdParam: 'id',
  })
  @Delete('timetable-entries/:id')
  @Roles(ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Remove timetable entry' })
  async removeEntry(@Param('id') id: string) {
    await this.timetableService.removeEntry(id);
    return { success: true, message: 'Entry removed' };
  }

  @AuditLog({
    action: 'post_timetables_id_entries_batch',
    module: 'timetable',
    resourceIdParam: 'id',
  })
  @Post('timetables/:id/entries/batch')
  @Roles(ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Batch update entries for a day' })
  async batchUpdate(@Param('id') id: string, @Body() dto: BatchEntriesDto) {
    const data = await this.timetableService.batchUpdateEntries(
      id,
      dto.dayOfWeek,
      dto.entries,
    );
    return { success: true, data };
  }

  @Get('timetables/:id/day/:day')
  @Roles(ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.STUDENT)
  @ApiOperation({ summary: 'Get entries for a specific day' })
  async getDayEntries(@Param('id') id: string, @Param('day') day: number) {
    const data = await this.timetableService.getDayEntries(id, day);
    return { success: true, data };
  }

  @Get('teachers/:teacherId/timetable')
  @Roles(ROLES.PRINCIPAL, ROLES.TEACHER)
  @ApiOperation({ summary: 'Get teacher timetable across classes' })
  async findByTeacher(
    @Param('teacherId') teacherId: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.timetableService.findByTeacher(
      teacherId,
      user.branchId,
    );
    return { success: true, data };
  }
}
