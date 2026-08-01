import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TransportService } from './transport.service';
import { DatabaseProvider } from '../../database/database.provider';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('TransportService', () => {
  let service: TransportService;
  let mockDb: MockDatabaseProvider;

  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransportService,
        { provide: DatabaseProvider, useValue: mockDb },
      ],
    }).compile();
    service = module.get<TransportService>(TransportService);
  });

  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  const T = { tenantId: 't-1', branchId: 'b-1' };

  describe('createVehicle', () => {
    it('should create a vehicle', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'v-1' }],
        [{ id: 'v-1', vehicleNumber: 'KA-01-1234', deletedAt: null }],
      );
      const result = await service.createVehicle({
        ...T,
        vehicleNumber: 'KA-01-1234',
      });
      expect(result.vehicleNumber).toBe('KA-01-1234');
    });
  });

  describe('findVehicleById', () => {
    it('should return a vehicle', async () => {
      mockDb.setDrizzleResults([
        { id: 'v-1', vehicleNumber: 'KA-01-1234', deletedAt: null },
      ]);
      const result = await service.findVehicleById('v-1');
      expect(result.id).toBe('v-1');
    });
    it('should throw on missing vehicle', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.findVehicleById('bad')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createRoute', () => {
    it('should create a route', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'r-1' }],
        [{ id: 'r-1', name: 'Route A', deletedAt: null }],
      );
      const result = await service.createRoute({ ...T, name: 'Route A' });
      expect(result.name).toBe('Route A');
    });
  });

  describe('findRouteById', () => {
    it('should throw on missing route', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.findRouteById('bad')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assignStudent', () => {
    it('should assign a student', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'as-1' }],
        [{ id: 'as-1', studentId: 's-1', routeId: 'r-1' }],
      );
      const result = await service.assignStudent({
        ...T,
        studentId: 's-1',
        routeId: 'r-1',
        effectiveFrom: '2026-01-01',
      });
      expect(result.studentId).toBe('s-1');
    });
  });

  describe('deleteVehicle', () => {
    it('should soft-delete a vehicle', async () => {
      mockDb.setDrizzleResults([{ id: 'v-1', deletedAt: null }], []);
      const result = await service.deleteVehicle('v-1');
      expect(result.success).toBe(true);
    });
  });
});
