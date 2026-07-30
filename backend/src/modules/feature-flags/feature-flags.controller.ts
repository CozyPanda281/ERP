import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FeatureFlagsService } from './feature-flags.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants';

@ApiTags('Feature Flags')
@ApiBearerAuth()
@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  @Get('tenant/:tenantId')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all enabled features for a tenant' })
  async getTenantFeatures(@Param('tenantId') tenantId: string) {
    const features = await this.featureFlagsService.getEnabledFeatures(
      tenantId,
    );
    return { success: true, data: features };
  }

  @Get('plan/:planId')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get feature configuration for a plan' })
  async getPlanFeatures(@Param('planId') planId: string) {
    const features = await this.featureFlagsService.getPlanFeatures(planId);
    return { success: true, data: features };
  }

  @Post('tenant/:tenantId/:featureCode')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Override a feature flag for a tenant' })
  async setTenantOverride(
    @Param('tenantId') tenantId: string,
    @Param('featureCode') featureCode: string,
    @Body() body: { enabled: boolean; overridePlan?: boolean },
  ) {
    await this.featureFlagsService.setTenantOverride(
      tenantId,
      featureCode,
      body.enabled,
      body.overridePlan,
    );
    return { success: true, message: 'Feature override updated' };
  }

  @Put('plan/:planId/:featureCode')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a feature flag for a plan' })
  async updatePlanFeature(
    @Param('planId') planId: string,
    @Param('featureCode') featureCode: string,
    @Body() body: { enabled: boolean },
  ) {
    await this.featureFlagsService.updatePlanFeature(
      planId,
      featureCode,
      body.enabled,
    );
    return { success: true, message: 'Plan feature updated' };
  }
}
