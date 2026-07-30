import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SystemConfigService } from './system-config.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants';

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

  @Put(':key')
  @ApiOperation({ summary: 'Set a config value' })
  async set(
    @Param('key') key: string,
    @Body() body: { value: any; description?: string },
  ) {
    const data = await this.systemConfigService.set(key, body.value, body.description);
    return { success: true, data };
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete a config key' })
  async delete(@Param('key') key: string) {
    await this.systemConfigService.delete(key);
    return { success: true, message: 'Config deleted' };
  }
}
