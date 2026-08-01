import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { DatabaseProvider } from '../../database/database.provider';
import { MockDatabaseProvider } from '../../common/test/mocks';
import { CryptoService } from '../../shared/crypto/crypto.service';

describe('TenantsService', () => {
  let service: TenantsService;
  let mockDb: MockDatabaseProvider;

  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: DatabaseProvider, useValue: mockDb },
        {
          provide: CryptoService,
          useValue: { encrypt: (v: string) => v, decrypt: (v: string) => v },
        },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
  });

  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated tenants', async () => {
      mockDb.setDrizzleResults(
        [{ id: 't-1', name: 'Test School', slug: 'test-school' }],
        [{ count: 1 }],
      );

      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should filter by status', async () => {
      mockDb.setDrizzleResults(
        [{ id: 't-1', name: 'Suspended School', status: 'suspended' }],
        [{ count: 1 }],
      );

      const result = await service.findAll({ status: 'suspended' });
      expect((result.data[0] as any).status).toBe('suspended');
    });

    it('should search by name', async () => {
      mockDb.setDrizzleResults(
        [{ id: 't-1', name: 'Springfield Elementary' }],
        [{ count: 1 }],
      );

      const result = await service.findAll({ search: 'springfield' });
      expect((result.data[0] as any).name).toContain('Springfield');
    });
  });

  describe('getTenantStats', () => {
    it('should return aggregated stats', async () => {
      mockDb.setDrizzleResults([
        {
          total: 10,
          active: 7,
          trial: 2,
          suspended: 1,
          newLast30Days: 3,
        },
      ]);

      const stats = await service.getTenantStats();
      expect(stats.total).toBe(10);
      expect(stats.active).toBe(7);
    });
  });

  describe('update', () => {
    it('should update tenant fields', async () => {
      mockDb.setDrizzleResults(
        [{ id: 't-1', name: 'Old Name', slug: 'old-name' }],
        [],
        [{ id: 't-1', name: 'New Name' }],
      );

      const result = await service.update('t-1', { name: 'New Name' });
      expect(result.name).toBe('New Name');
    });

    it('should throw on nonexistent tenant', async () => {
      mockDb.setDrizzleResults([]);

      await expect(
        service.update('nonexistent', { name: 'Nope' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should activate a tenant', async () => {
      mockDb.setDrizzleResults(
        [{ id: 't-1', status: 'suspended' }],
        [],
        [{ id: 't-1', status: 'active' }],
      );

      const result = await service.updateStatus('t-1', 'active');
      expect(result.status).toBe('active');
    });

    it('should throw on invalid status', async () => {
      await expect(
        service.updateStatus('t-1', 'invalid-status'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('softDelete', () => {
    it('should soft delete a tenant', async () => {
      mockDb.setDrizzleResults([{ id: 't-1', name: 'Test' }], [], [], []);

      await expect(service.softDelete('t-1')).resolves.not.toThrow();
    });
  });

  describe('firstRunSetup', () => {
    it('should create branch, academic year and assign branchId to owner role', async () => {
      mockDb.setDrizzleResults(
        [{ id: 't-1', name: 'Test School', slug: 'test-school' }],
        [],
        [],
        [],
        [],
        [{ id: 'ur-1' }],
        [],
      );

      const result = await service.firstRunSetup('t-1', {
        branchName: 'Main Branch',
        branchCode: 'MB-01',
        academicYearName: '2026-27',
        academicYearStart: '2026-04-01',
        academicYearEnd: '2027-03-31',
      });

      expect(result.tenantId).toBe('t-1');
      expect(result.branchId).toBeTruthy();
      expect(result.academicYearId).toBeTruthy();
      expect(result.classId).toBeUndefined();
      expect(result.message).toBe('Tenant setup complete');
    });

    it('should throw when tenant already has branches', async () => {
      mockDb.setDrizzleResults(
        [{ id: 't-1', name: 'Test School' }],
        [{ id: 'b-1' }],
      );

      await expect(
        service.firstRunSetup('t-1', {
          branchName: 'Main Branch',
          branchCode: 'MB-01',
          academicYearName: '2026-27',
          academicYearStart: '2026-04-01',
          academicYearEnd: '2027-03-31',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
