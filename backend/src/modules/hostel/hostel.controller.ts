import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HostelService } from './hostel.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ROLES } from '../../common/constants';
import { CreateHostelDto } from './dto/create-hostel.dto';
import { UpdateHostelDto } from './dto/update-hostel.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { AllocateBedDto } from './dto/allocate-bed.dto';
import { HostelQueryDto } from './dto/hostel-query.dto';

@ApiTags('Hostel')
@ApiBearerAuth()
@Controller('hostel')
export class HostelController {
  constructor(private readonly service: HostelService) {}

  @Post()
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create a hostel' })
  async createHostel(@Body() body: CreateHostelDto, @CurrentUser() user: any) {
    const data = await this.service.createHostel({ ...body, tenantId: user.tenantId, branchId: user.branchId });
    return { success: true, data };
  }

  @Get()
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List hostels' })
  async getHostels(@CurrentUser() user: any, @Query() query: HostelQueryDto) {
    const data = await this.service.findHostelsByBranch(user.branchId, query);
    return { success: true, ...data };
  }

  @Get(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Get hostel by ID' })
  async getHostelById(@Param('id') id: string) {
    const data = await this.service.findHostelById(id);
    return { success: true, data };
  }

  @Put(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Update hostel' })
  async updateHostel(@Param('id') id: string, @Body() body: UpdateHostelDto) {
    const data = await this.service.updateHostel(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Delete hostel' })
  async deleteHostel(@Param('id') id: string) {
    return this.service.deleteHostel(id);
  }

  @Post(':hostelId/rooms')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create a room' })
  async createRoom(@Param('hostelId') hostelId: string, @Body() body: CreateRoomDto) {
    const data = await this.service.createRoom({ ...body, hostelId });
    return { success: true, data };
  }

  @Get(':hostelId/rooms')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List rooms by hostel' })
  async getRooms(@Param('hostelId') hostelId: string, @Query() query: HostelQueryDto) {
    const data = await this.service.findRoomsByHostel(hostelId, query);
    return { success: true, ...data };
  }

  @Get('rooms/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Get room by ID' })
  async getRoomById(@Param('id') id: string) {
    const data = await this.service.findRoomById(id);
    return { success: true, data };
  }

  @Put('rooms/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Update room' })
  async updateRoom(@Param('id') id: string, @Body() body: UpdateRoomDto) {
    const data = await this.service.updateRoom(id, body);
    return { success: true, data };
  }

  @Delete('rooms/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Delete room' })
  async deleteRoom(@Param('id') id: string) {
    return this.service.deleteRoom(id);
  }

  @Post('allocations')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Allocate bed to student' })
  async allocateBed(@Body() body: AllocateBedDto, @CurrentUser() user: any) {
    const data = await this.service.allocateBed({ ...body, tenantId: user.tenantId, branchId: user.branchId });
    return { success: true, data };
  }

  @Get('allocations')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List allocations' })
  async getAllocations(@CurrentUser() user: any, @Query() query: HostelQueryDto) {
    const data = await this.service.findAllocationsByBranch(user.branchId, query);
    return { success: true, ...data };
  }

  @Delete('allocations/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Vacate bed' })
  async vacateBed(@Param('id') id: string) {
    return this.service.vacateBed(id);
  }
}
