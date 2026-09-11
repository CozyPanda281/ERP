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
import { HostelService } from './hostel.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { ROLES } from '../../common/constants';
import { CreateHostelDto } from './dto/create-hostel.dto';
import { UpdateHostelDto } from './dto/update-hostel.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { AllocateBedDto } from './dto/allocate-bed.dto';
import { HostelQueryDto } from './dto/hostel-query.dto';
import { AuditLog } from '../../common/decorators/audit-log.decorator';

@ApiTags('Hostel')
@ApiBearerAuth()
@RequiresFeature('hostel')
@Controller('hostel')
export class HostelController {
  constructor(private readonly service: HostelService) {}

  @AuditLog({ action: 'post_root', module: 'hostel' })
  @Post()
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.ORGANIZATION_OWNER,
    ROLES.HOSTEL_MANAGER,
  )
  @ApiOperation({ summary: 'Create a hostel' })
  async createHostel(@Body() body: CreateHostelDto, @CurrentUser() user: any) {
    const data = await this.service.createHostel({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }

  @Get()
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.ORGANIZATION_OWNER,
    ROLES.HOSTEL_MANAGER,
  )
  @ApiOperation({ summary: 'List hostels' })
  async getHostels(@CurrentUser() user: any, @Query() query: HostelQueryDto) {
    const data = await this.service.findHostelsByBranch(user.branchId, query);
    return { success: true, ...data };
  }

  @Get('allocations')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.ORGANIZATION_OWNER,
    ROLES.HOSTEL_MANAGER,
  )
  @ApiOperation({ summary: 'List allocations' })
  async getAllocations(
    @CurrentUser() user: any,
    @Query() query: HostelQueryDto,
  ) {
    const data = await this.service.findAllocationsByBranch(
      user.branchId,
      query,
    );
    return { success: true, ...data };
  }

  @Get(':id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.ORGANIZATION_OWNER,
    ROLES.HOSTEL_MANAGER,
  )
  @ApiOperation({ summary: 'Get hostel by ID' })
  async getHostelById(@Param('id') id: string) {
    const data = await this.service.findHostelById(id);
    return { success: true, data };
  }

  @AuditLog({ action: 'put_id', module: 'hostel', resourceIdParam: 'id' })
  @Put(':id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.ORGANIZATION_OWNER,
    ROLES.HOSTEL_MANAGER,
  )
  @ApiOperation({ summary: 'Update hostel' })
  async updateHostel(@Param('id') id: string, @Body() body: UpdateHostelDto) {
    const data = await this.service.updateHostel(id, body);
    return { success: true, data };
  }

  @AuditLog({ action: 'delete_id', module: 'hostel', resourceIdParam: 'id' })
  @Delete(':id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.ORGANIZATION_OWNER,
    ROLES.HOSTEL_MANAGER,
  )
  @ApiOperation({ summary: 'Delete hostel' })
  async deleteHostel(@Param('id') id: string) {
    return { success: true, data: await this.service.deleteHostel(id) };
  }

  @AuditLog({
    action: 'post_hostelId_rooms',
    module: 'hostel',
    resourceIdParam: 'id',
  })
  @Post(':hostelId/rooms')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.ORGANIZATION_OWNER,
    ROLES.HOSTEL_MANAGER,
  )
  @ApiOperation({ summary: 'Create a room' })
  async createRoom(
    @Param('hostelId') hostelId: string,
    @Body() body: CreateRoomDto,
  ) {
    const data = await this.service.createRoom({ ...body, hostelId });
    return { success: true, data };
  }

  @Get(':hostelId/rooms')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.ORGANIZATION_OWNER,
    ROLES.HOSTEL_MANAGER,
  )
  @ApiOperation({ summary: 'List rooms by hostel' })
  async getRooms(
    @Param('hostelId') hostelId: string,
    @Query() query: HostelQueryDto,
  ) {
    const data = await this.service.findRoomsByHostel(hostelId, query);
    return { success: true, ...data };
  }

  @Get('rooms/:id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.ORGANIZATION_OWNER,
    ROLES.HOSTEL_MANAGER,
  )
  @ApiOperation({ summary: 'Get room by ID' })
  async getRoomById(@Param('id') id: string) {
    const data = await this.service.findRoomById(id);
    return { success: true, data };
  }

  @AuditLog({ action: 'put_rooms_id', module: 'hostel', resourceIdParam: 'id' })
  @Put('rooms/:id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.ORGANIZATION_OWNER,
    ROLES.HOSTEL_MANAGER,
  )
  @ApiOperation({ summary: 'Update room' })
  async updateRoom(@Param('id') id: string, @Body() body: UpdateRoomDto) {
    const data = await this.service.updateRoom(id, body);
    return { success: true, data };
  }

  @AuditLog({
    action: 'delete_rooms_id',
    module: 'hostel',
    resourceIdParam: 'id',
  })
  @Delete('rooms/:id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.ORGANIZATION_OWNER,
    ROLES.HOSTEL_MANAGER,
  )
  @ApiOperation({ summary: 'Delete room' })
  async deleteRoom(@Param('id') id: string) {
    return { success: true, data: await this.service.deleteRoom(id) };
  }

  @AuditLog({ action: 'post_allocations', module: 'hostel' })
  @Post('allocations')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.ORGANIZATION_OWNER,
    ROLES.HOSTEL_MANAGER,
  )
  @ApiOperation({ summary: 'Allocate bed to student' })
  async allocateBed(@Body() body: AllocateBedDto, @CurrentUser() user: any) {
    const data = await this.service.allocateBed({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }

  @AuditLog({
    action: 'delete_allocations_id',
    module: 'hostel',
    resourceIdParam: 'id',
  })
  @Delete('allocations/:id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.ORGANIZATION_OWNER,
    ROLES.HOSTEL_MANAGER,
  )
  @ApiOperation({ summary: 'Vacate bed' })
  async vacateBed(@Param('id') id: string) {
    return { success: true, data: await this.service.vacateBed(id) };
  }
}
