import { Test, TestingModule } from '@nestjs/testing';
import { FeatureFlagsService } from './feature-flags.service';
import { DatabaseProvider } from '../../database/database.provider';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;
  let mockDb: MockDatabaseProvider;

  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagsService,
        { provide: DatabaseProvider, useValue: mockDb },
      ],
    }).compile();

    service = module.get<FeatureFlagsService>(FeatureFlagsService);
  });

  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  describe('isFeatureEnabled', () => {
    it('should return true when feature is enabled via plan', async () => {
      mockDb.setDrizzleResults(
        [{ planId: 'plan-1' }],
        [{ isEnabled: true, overridePlan: false }],
      );

      const result = await service.isFeatureEnabled('tenant-1', 'multi_branch');
      expect(result).toBe(true);
    });

    it('should return false when feature is disabled', async () => {
      mockDb.setDrizzleResults(
        [{ planId: 'plan-1' }],
        [{ isEnabled: false, overridePlan: false }],
      );

      const result = await service.isFeatureEnabled('tenant-1', 'hostel');
      expect(result).toBe(false);
    });

    it('should return false when no result found', async () => {
      mockDb.setDrizzleResults([]);

      const result = await service.isFeatureEnabled('tenant-1', 'nonexistent');
      expect(result).toBe(false);
    });

    it('should use cached value on second call', async () => {
      mockDb.setDrizzleResults(
        [{ planId: 'plan-1' }],
        [{ isEnabled: true, overridePlan: false }],
      );

      const spy = jest.spyOn(mockDb, 'query');

      await service.isFeatureEnabled('tenant-1', 'reception');
      await service.isFeatureEnabled('tenant-1', 'reception');

      expect(spy).toHaveBeenCalledTimes(0);
    });
  });

  describe('getEnabledFeatures', () => {
    it('should return list of enabled features', async () => {
      mockDb.setDrizzleResults(
        [{ planId: 'plan-1' }],
        [
          { code: 'reception', isEnabled: true },
          { code: 'multi_branch', isEnabled: false },
          { code: 'library', isEnabled: true },
        ],
      );

      const features = await service.getEnabledFeatures('tenant-1');
      expect(features).toContain('reception');
      expect(features).toContain('library');
      expect(features).not.toContain('multi_branch');
    });
  });

  describe('setTenantOverride', () => {
    it('should update tenant feature override', async () => {
      mockDb.setDrizzleResults([{ id: 'flag-1' }], []);

      await expect(
        service.setTenantOverride('tenant-1', 'hostel', true, true),
      ).resolves.not.toThrow();
    });

    it('should throw for unknown feature code', async () => {
      mockDb.setDrizzleResults([]);

      await expect(
        service.setTenantOverride('tenant-1', 'unknown_feature', true),
      ).rejects.toThrow("Feature flag 'unknown_feature' not found");
    });
  });
});
