import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { IdCardsService } from './id-cards.service';
import { DatabaseProvider } from '../../database/database.provider';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('IdCardsService', () => {
  let service: IdCardsService;
  let mockDb: MockDatabaseProvider;
  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdCardsService,
        { provide: DatabaseProvider, useValue: mockDb },
      ],
    }).compile();
    service = module.get<IdCardsService>(IdCardsService);
  });
  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  describe('createTemplate', () => {
    it('should create ID card template', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'tpl-1' }],
        [{ id: 'tpl-1', name: 'Student ID' }],
      );
      const r = await service.createTemplate({
        tenantId: 't-1',
        branchId: 'b-1',
        name: 'Student ID',
        templateType: 'student',
        designConfig: {},
      });
      expect(r.name).toBe('Student ID');
    });
  });
  describe('findTemplateById', () => {
    it('should throw on missing', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.findTemplateById('bad')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
  describe('issueCertificate', () => {
    it('should issue certificate', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'cert-1' }],
        [{ id: 'cert-1', certificateNumber: 'C-001' }],
      );
      const r = await service.issueCertificate({
        tenantId: 't-1',
        branchId: 'b-1',
        certificateNumber: 'C-001',
        recipientType: 'student',
        recipientId: 's-1',
        issuedDate: '2026-01-01',
      });
      expect(r.certificateNumber).toBe('C-001');
    });
  });
});
