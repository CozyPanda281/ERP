import { Controller, Get, Put, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SystemConfigService } from './system-config.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants';
import { UpdateSystemConfigDto } from './dto/update-config.dto';
import { AuditLog } from '../../common/decorators/audit-log.decorator';

@ApiTags('System Config')
@ApiBearerAuth()
@Controller('system-config')
@Roles(ROLES.SUPER_ADMIN)
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Get all system configuration (SuperAdmin)' })
  async getAll() {
    const data = await this.systemConfigService.getAll();
    return { success: true, data };
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get a specific config value' })
  async get(@Param('key') key: string) {
    const data = await this.systemConfigService.get(key);
    return { success: true, data };
  }

  @AuditLog({
    action: 'put_key',
    module: 'system-config',
    resourceIdParam: 'id',
  })
  @Put(':key')
  @ApiOperation({ summary: 'Set a config value' })
  async set(@Param('key') key: string, @Body() dto: UpdateSystemConfigDto) {
    const data = await this.systemConfigService.set(
      key,
      dto.value,
      dto.description,
    );
    return { success: true, data };
  }

  @AuditLog({
    action: 'delete_key',
    module: 'system-config',
    resourceIdParam: 'id',
  })
  @Delete(':key')
  @ApiOperation({ summary: 'Delete a config key' })
  async delete(@Param('key') key: string) {
    await this.systemConfigService.delete(key);
    return { success: true, message: 'Config deleted' };
  }
}
