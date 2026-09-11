import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { PublicApiService } from './public-api.service';
import { Public } from '../../common/decorators/public.decorator';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@ApiTags('Public API')
@ApiBearerAuth()
@Public()
@UseGuards(ApiKeyGuard)
@Controller('public')
export class PublicApiController {
  constructor(private readonly publicApiService: PublicApiService) {}

  @Get('students')
  @ApiOperation({ summary: 'List students (API key auth)' })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  listStudents(
    @Req() req: Request,
    @Query('classId') classId?: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.wrap(
      this.publicApiService.listStudents((req.user as any).tenantId, {
        classId,
        academicYearId,
        status,
        q,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      }),
    );
  }

  @Get('students/:id')
  @ApiOperation({ summary: 'Get student by id (API key auth)' })
  getStudent(@Req() req: Request, @Param('id') id: string) {
    return this.wrap(
      this.publicApiService.getStudent((req.user as any).tenantId, id),
    );
  }

  @Get('fee/accounts')
  @ApiOperation({ summary: 'List fee accounts (API key auth)' })
  listFeeAccounts(
    @Req() req: Request,
    @Query('studentId') studentId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.wrap(
      this.publicApiService.listFeeAccounts((req.user as any).tenantId, {
        studentId,
        status,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      }),
    );
  }

  @Get('fee/invoices')
  @ApiOperation({ summary: 'List fee invoices (API key auth)' })
  listInvoices(
    @Req() req: Request,
    @Query('studentId') studentId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.wrap(
      this.publicApiService.listInvoices((req.user as any).tenantId, {
        studentId,
        status,
        from,
        to,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      }),
    );
  }

  @Get('fee/payments')
  @ApiOperation({ summary: 'List fee payments (API key auth)' })
  listPayments(
    @Req() req: Request,
    @Query('studentId') studentId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.wrap(
      this.publicApiService.listPayments((req.user as any).tenantId, {
        studentId,
        from,
        to,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      }),
    );
  }

  @Get('attendance')
  @ApiOperation({ summary: 'List attendance records (API key auth)' })
  listAttendance(
    @Req() req: Request,
    @Query('studentId') studentId?: string,
    @Query('classId') classId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.wrap(
      this.publicApiService.listAttendance((req.user as any).tenantId, {
        studentId,
        classId,
        from,
        to,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      }),
    );
  }

  @Get('results')
  @ApiOperation({ summary: 'List exam results (API key auth)' })
  listResults(
    @Req() req: Request,
    @Query('studentId') studentId?: string,
    @Query('examId') examId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.wrap(
      this.publicApiService.listResults((req.user as any).tenantId, {
        studentId,
        examId,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      }),
    );
  }

  private async wrap<T>(promise: Promise<T>) {
    return { success: true, data: await promise };
  }
}
