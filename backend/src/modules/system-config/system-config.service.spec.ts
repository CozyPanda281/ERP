import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { DatabaseProvider } from '../../database/database.provider';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('SystemConfigService', () => {
  let service: SystemConfigService;
  let mockDb: MockDatabaseProvider;

  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemConfigService,
        { provide: DatabaseProvider, useValue: mockDb },
      ],
    }).compile();

    service = module.get<SystemConfigService>(SystemConfigService);
  });

  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return config by key', async () => {
      mockDb.setDrizzleResults([
        { configKey: 'default_plan', configValue: { code: 'basic' } },
      ]);

      const result = await service.get('default_plan');
      expect(result.configKey).toBe('default_plan');
    });

    it('should return null for unknown key', async () => {
      mockDb.setDrizzleResults([]);

      const result = await service.get('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return all configs', async () => {
      mockDb.setDrizzleResults([
        { configKey: 'a', configValue: { val: 1 } },
        { configKey: 'b', configValue: { val: 2 } },
      ]);

      const result = await service.getAll();
      expect(result).toHaveLength(2);
    });
  });

  describe('set', () => {
    it('should insert new config', async () => {
      mockDb.setDrizzleResults(
        [],
        [],
        [{ configKey: 'test_key', configValue: { enabled: true } }],
      );

      const result = await service.set('test_key', { enabled: true }, 'Test config');
      expect(result.configKey).toBe('test_key');
    });

    it('should update existing config', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'existing-id' }],
        [],
        [{ configKey: 'test_key', configValue: { val: 2 } }],
      );

      const result = await service.set('test_key', { val: 2 });
      expect(result).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete existing config', async () => {
      mockDb.setDrizzleResults([
        { id: 'deleted' },
      ]);

      await expect(service.delete('test_key')).resolves.not.toThrow();
    });

    it('should throw on nonexistent config', async () => {
      mockDb.setDrizzleResults([]);

      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
