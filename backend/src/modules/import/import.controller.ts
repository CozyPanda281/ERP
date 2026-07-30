import { Controller, Get, Post, Put, Param, Body, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService } from './import.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ROLES } from '../../common/constants';
import { UpdatePreviewDto } from './dto/update-preview.dto';
import { ApproveBatchDto } from './dto/approve-batch.dto';
import { RejectBatchDto } from './dto/reject-batch.dto';
import { ListBatchesQueryDto } from './dto/list-batches-query.dto';

@ApiTags('Import')
@ApiBearerAuth()
@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Get('entity-types')
  @Roles(ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER, ROLES.HR)
  @ApiOperation({ summary: 'List supported entity types for import' })
  getEntityTypes() {
    return { success: true, data: this.importService.getSupportedEntityTypes() };
  }

  @Post('upload')
  @Roles(ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER, ROLES.HR, ROLES.RECEPTION)
  @ApiOperation({ summary: 'Upload a file for bulk import' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('entityType') entityType: string,
    @Body('branchId') branchId?: string,
  ) {
    if (!file) throw new Error('File is required');
    const data = await this.importService.upload(
      user.tenantId, user.id, entityType, file.buffer, file.originalname, branchId,
    );
    return { success: true, data };
  }

  @Get('batches')
  @Roles(ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER, ROLES.HR)
  @ApiOperation({ summary: 'List import batches' })
  async listBatches(@CurrentUser() user: any, @Query() query: ListBatchesQueryDto) {
    return this.importService.listBatches(user.tenantId, query.entityType, query.status, query.page, query.limit);
  }

  @Get('batches/:id')
  @Roles(ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER, ROLES.HR)
  @ApiOperation({ summary: 'Get import batch details with preview' })
  async getBatch(@Param('id') id: string) {
    const data = await this.importService.getBatch(id);
    return { success: true, data };
  }

  @Put('batches/:id/preview')
  @Roles(ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER, ROLES.HR)
  @ApiOperation({ summary: 'Update rows in a batch preview before approval' })
  async updatePreview(@Param('id') id: string, @Body() dto: UpdatePreviewDto) {
    const data = await this.importService.updatePreview(id, dto.rows);
    return { success: true, data };
  }

  @Post('batches/:id/approve')
  @Roles(ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Approve import batch for deployment' })
  async approve(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: ApproveBatchDto) {
    const data = await this.importService.approve(id, user.id, dto.notes);
    return { success: true, data };
  }

  @Post('batches/:id/reject')
  @Roles(ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Reject import batch' })
  async reject(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: RejectBatchDto) {
    const data = await this.importService.reject(id, user.id, dto.reason);
    return { success: true, data };
  }

  @Post('batches/:id/deploy')
  @Roles(ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Deploy approved batch to database' })
  async deploy(@CurrentUser() user: any, @Param('id') id: string) {
    const data = await this.importService.deploy(id, user.id);
    return { success: true, data };
  }

  @Post('batches/:id/rollback')
  @Roles(ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Rollback a deployed batch' })
  async rollback(@CurrentUser() user: any, @Param('id') id: string) {
    const data = await this.importService.rollback(id, user.id);
    return { success: true, data };
  }
}
