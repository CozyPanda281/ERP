import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LibraryService } from './library.service';
import { DatabaseProvider } from '../../database/database.provider';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('LibraryService', () => {
  let service: LibraryService;
  let mockDb: MockDatabaseProvider;

  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibraryService,
        { provide: DatabaseProvider, useValue: mockDb },
      ],
    }).compile();
    service = module.get<LibraryService>(LibraryService);
  });

  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  const T = { tenantId: 't-1', branchId: 'b-1' };

  describe('createBook', () => {
    it('should create a book', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'bk-1' }],
        [
          {
            id: 'bk-1',
            title: 'Test Book',
            availableCopies: 1,
            deletedAt: null,
          },
        ],
      );
      const result = await service.createBook({ ...T, title: 'Test Book' });
      expect(result.title).toBe('Test Book');
    });
  });

  describe('findBookById', () => {
    it('should return a book', async () => {
      mockDb.setDrizzleResults([
        { id: 'bk-1', title: 'Test Book', availableCopies: 1, deletedAt: null },
      ]);
      const result = await service.findBookById('bk-1');
      expect(result.id).toBe('bk-1');
    });
    it('should throw on missing book', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.findBookById('bad')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('issueBook', () => {
    it('should issue a book and decrement copies', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'bk-1', availableCopies: 5, deletedAt: null }],
        [{ id: 'is-1' }],
        [],
        [{ id: 'is-1', bookId: 'bk-1', memberId: 'm-1' }],
      );
      const result = await service.issueBook({
        ...T,
        memberId: 'm-1',
        bookId: 'bk-1',
        issueDate: '2026-01-01',
        dueDate: '2026-01-15',
      });
      expect(result.memberId).toBe('m-1');
    });

    it('should throw if no copies available', async () => {
      mockDb.setDrizzleResults([
        { id: 'bk-1', availableCopies: 0, deletedAt: null },
      ]);
      await expect(
        service.issueBook({
          ...T,
          memberId: 'm-1',
          bookId: 'bk-1',
          issueDate: '2026-01-01',
          dueDate: '2026-01-15',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('returnBook', () => {
    it('should return a book and increment copies', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'is-1', bookId: 'bk-1', returnDate: null }],
        [],
        [],
      );
      const result = await service.returnBook('is-1');
      expect(result.success).toBe(true);
    });

    it('should throw on missing issue record', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.returnBook('bad')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
