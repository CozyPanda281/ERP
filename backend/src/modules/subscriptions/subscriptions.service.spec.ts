import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { DatabaseProvider } from '../../database/database.provider';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let mockDb: MockDatabaseProvider;

  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: DatabaseProvider, useValue: mockDb },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
  });

  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  describe('createPlan', () => {
    it('should create a new plan', async () => {
      mockDb.setDrizzleResults(
        [],
        [],
        [{ id: 'plan-1', name: 'Test Plan', code: 'test' }],
      );

      const plan = await service.createPlan({
        name: 'Test Plan',
        code: 'test',
        priceMonthly: 0,
        priceYearly: 0,
        maxBranches: 1,
        maxUsers: 50,
        maxStudents: 500,
        maxStaff: 20,
        storageLimitMb: 500,
        features: {},
      });

      expect(plan).toBeDefined();
      expect(plan.name).toBe('Test Plan');
    });

    it('should throw on duplicate plan code', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'existing-plan' }],
      );

      await expect(
        service.createPlan({
          name: 'Duplicate',
          code: 'basic',
          priceMonthly: 0,
          priceYearly: 0,
          maxBranches: 1,
          maxUsers: 50,
          maxStudents: 500,
          maxStaff: 20,
          storageLimitMb: 500,
          features: {},
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('plan limits', () => {
    it('should return true when under branch limit', async () => {
      mockDb.setDrizzleResults(
        [{ maxBranches: 5, maxUsers: 100, maxStudents: 1000, maxStaff: 50, storageLimitMb: 1024 }],
        [{ count: 3 }],
      );

      const result = await service.canCreateBranch('tenant-1');
      expect(result).toBe(true);
    });

    it('should return false when at branch limit', async () => {
      mockDb.setDrizzleResults(
        [{ maxBranches: 3, maxUsers: 100, maxStudents: 1000, maxStaff: 50, storageLimitMb: 1024 }],
        [{ count: 3 }],
      );

      const result = await service.canCreateBranch('tenant-1');
      expect(result).toBe(false);
    });

    it('should return false when no subscription found', async () => {
      mockDb.setDrizzleResults(
        [],
      );

      const result = await service.canCreateBranch('tenant-nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('subscription lifecycle', () => {
    it('should assign subscription with trial', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'plan-1', name: 'Pro', code: 'pro', maxBranches: 1, maxUsers: 100, maxStudents: 1000, maxStaff: 50, storageLimitMb: 1024 }],
        [],
        [],
        [{ id: 'sub-1', planId: 'plan-1', status: 'trial', billingCycle: 'monthly', planName: 'Pro', planCode: 'pro', maxBranches: 1, maxUsers: 100, maxStudents: 1000, maxStaff: 50, storageLimitMb: 1024, planFeatures: {} }],
      );

      const result = await service.assignSubscription({
        tenantId: 'tenant-1',
        planId: 'plan-1',
        trialDays: 14,
      });

      expect(result).toBeDefined();
    });

    it('should cancel subscription', async () => {
      mockDb.setDrizzleResults(
        [],
      );

      const result = await service.cancelSubscription('tenant-1');
      expect(result.message).toContain('cancelled');
    });

    it('should throw when changing to nonexistent plan', async () => {
      mockDb.setDrizzleResults(
        [],
      );

      await expect(
        service.changePlan('tenant-1', 'nonexistent-plan'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
