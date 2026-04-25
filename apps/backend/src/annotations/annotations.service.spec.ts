import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AnnotationsService } from './annotations.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ImagesService } from '../images/images.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockAnnotation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ann-1',
    imageId: 'img-1',
    labelClassId: 'lc-1',
    x: 10,
    y: 10,
    width: 100,
    height: 100,
    source: 'manual',
    status: 'approved',
    confidence: null,
    version: 1,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    image: {
      id: 'img-1',
      datasetId: 'ds-1',
      width: 800,
      height: 600,
      dataset: {
        projectId: 'proj-1',
        project: { userId: 'user-1' },
      },
    },
    labelClass: { id: 'lc-1', name: 'cat', colorHex: '#000' },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAnnotationOps = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  delete: jest.fn(),
};

const mockPrisma: any = {
  annotation: mockAnnotationOps,
  labelClass: { findFirst: jest.fn() },
  image: { findUnique: jest.fn() },
  $transaction: jest.fn((fn: (tx: any) => unknown) => fn(mockPrisma)),
};

const mockRedis = {
  del: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
};

const mockImages = {
  verifyOwnership: jest.fn(),
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('AnnotationsService', () => {
  let service: AnnotationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnotationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: ImagesService, useValue: mockImages },
      ],
    }).compile();

    service = module.get<AnnotationsService>(AnnotationsService);
    jest.clearAllMocks();

    // Default: transaction just runs the callback
    mockPrisma.$transaction.mockImplementation((fn: (tx: any) => unknown) => fn(mockPrisma));
  });

  // -------------------------------------------------------------------------
  // findByImage — pagination
  // -------------------------------------------------------------------------

  describe('findByImage', () => {
    it('returns annotations with null nextCursor when under the limit', async () => {
      mockImages.verifyOwnership.mockResolvedValue({
        image: {},
        datasetId: 'ds-1',
        projectId: 'proj-1',
      });
      mockPrisma.annotation.findMany.mockResolvedValue([mockAnnotation()]);

      const result = await service.findByImage('img-1', 'user-1');

      expect(result.annotations).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
    });

    it('uses default limit of 500 when no limit supplied', async () => {
      mockImages.verifyOwnership.mockResolvedValue({});
      mockPrisma.annotation.findMany.mockResolvedValue([]);

      await service.findByImage('img-1', 'user-1');

      expect(mockPrisma.annotation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 501 })
      );
    });

    it('uses custom limit when provided', async () => {
      mockImages.verifyOwnership.mockResolvedValue({});
      mockPrisma.annotation.findMany.mockResolvedValue([]);

      await service.findByImage('img-1', 'user-1', { limit: 10 });

      expect(mockPrisma.annotation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 11 })
      );
    });

    it('caps limit at MAX_ANNOTATION_LIMIT (1000)', async () => {
      mockImages.verifyOwnership.mockResolvedValue({});
      mockPrisma.annotation.findMany.mockResolvedValue([]);

      await service.findByImage('img-1', 'user-1', { limit: 9999 });

      expect(mockPrisma.annotation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1001 })
      );
    });

    it('returns nextCursor when there are more items than the limit', async () => {
      mockImages.verifyOwnership.mockResolvedValue({});
      // Return 3 items when limit=2 → signals there is a next page
      const ann1 = mockAnnotation({ id: 'ann-1' });
      const ann2 = mockAnnotation({ id: 'ann-2' });
      const ann3 = mockAnnotation({ id: 'ann-3' }); // the sentinel
      mockPrisma.annotation.findMany.mockResolvedValue([ann1, ann2, ann3]);

      const result = await service.findByImage('img-1', 'user-1', { limit: 2 });

      expect(result.annotations).toHaveLength(2);
      expect(result.nextCursor).toBe('ann-3');
    });

    it('only returns non-deleted annotations (deletedAt filter)', async () => {
      mockImages.verifyOwnership.mockResolvedValue({});
      mockPrisma.annotation.findMany.mockResolvedValue([]);

      await service.findByImage('img-1', 'user-1');

      expect(mockPrisma.annotation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) })
      );
    });
  });

  // -------------------------------------------------------------------------
  // bulkUpdateStatus — validation
  // -------------------------------------------------------------------------

  describe('bulkUpdateStatus', () => {
    it('throws ForbiddenException when count mismatches (user does not own all)', async () => {
      // User owns 1, but 2 requested
      mockPrisma.annotation.count.mockResolvedValue(1);

      await expect(
        service.bulkUpdateStatus('user-1', {
          annotationIds: ['ann-1', 'ann-2'],
          status: 'approved',
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns updated count when all annotations are owned', async () => {
      mockPrisma.annotation.count.mockResolvedValue(2);
      mockPrisma.annotation.findMany.mockResolvedValue([
        { imageId: 'img-1', image: { datasetId: 'ds-1' } },
      ]);
      mockPrisma.annotation.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkUpdateStatus('user-1', {
        annotationIds: ['ann-1', 'ann-2'],
        status: 'approved',
      });

      expect(result).toEqual({ updated: 2 });
    });

    it('rejects if requested IDs do not match owned count (missing IDs)', async () => {
      mockPrisma.annotation.count.mockResolvedValue(0);

      await expect(
        service.bulkUpdateStatus('user-1', { annotationIds: ['nonexistent'], status: 'draft' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('invalidates cache after successful bulk update', async () => {
      mockPrisma.annotation.count.mockResolvedValue(1);
      mockPrisma.annotation.findMany.mockResolvedValue([
        { imageId: 'img-1', image: { datasetId: 'ds-1' } },
      ]);
      mockPrisma.annotation.updateMany.mockResolvedValue({ count: 1 });

      await service.bulkUpdateStatus('user-1', { annotationIds: ['ann-1'], status: 'rejected' });

      expect(mockRedis.del).toHaveBeenCalledWith('image:img-1:annotations');
      expect(mockRedis.del).toHaveBeenCalledWith('dataset:ds-1:summary');
    });
  });

  // -------------------------------------------------------------------------
  // delete — soft delete
  // -------------------------------------------------------------------------

  describe('delete', () => {
    it('soft deletes annotation (sets deletedAt, does not hard delete)', async () => {
      mockPrisma.annotation.findUnique.mockResolvedValue(mockAnnotation());
      mockPrisma.annotation.update.mockResolvedValue({});

      await service.delete('ann-1', 'user-1');

      expect(mockPrisma.annotation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ann-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
      expect(mockPrisma.annotation.delete).not.toHaveBeenCalled();
    });

    it('returns { success: true }', async () => {
      mockPrisma.annotation.findUnique.mockResolvedValue(mockAnnotation());
      mockPrisma.annotation.update.mockResolvedValue({});

      const result = await service.delete('ann-1', 'user-1');
      expect(result).toEqual({ success: true });
    });

    it('throws NotFoundException for non-existent annotation', async () => {
      mockPrisma.annotation.findUnique.mockResolvedValue(null);

      await expect(service.delete('no-such', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for annotation owned by another user', async () => {
      mockPrisma.annotation.findUnique.mockResolvedValue(
        mockAnnotation({
          image: {
            id: 'img-1',
            datasetId: 'ds-1',
            width: 800,
            height: 600,
            dataset: { projectId: 'proj-1', project: { userId: 'other-user' } },
          },
        })
      );

      await expect(service.delete('ann-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('treats already-soft-deleted annotation as not found', async () => {
      mockPrisma.annotation.findUnique.mockResolvedValue(mockAnnotation({ deletedAt: new Date() }));

      await expect(service.delete('ann-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('invalidates both cache keys after delete', async () => {
      mockPrisma.annotation.findUnique.mockResolvedValue(mockAnnotation());
      mockPrisma.annotation.update.mockResolvedValue({});

      await service.delete('ann-1', 'user-1');

      expect(mockRedis.del).toHaveBeenCalledWith('image:img-1:annotations');
      expect(mockRedis.del).toHaveBeenCalledWith('dataset:ds-1:summary');
    });
  });

  // -------------------------------------------------------------------------
  // update — version increment
  // -------------------------------------------------------------------------

  describe('update', () => {
    it('includes version increment in update data', async () => {
      mockPrisma.annotation.findUnique.mockResolvedValue(mockAnnotation());
      mockPrisma.annotation.update.mockResolvedValue(mockAnnotation({ version: 2 }));

      await service.update('ann-1', 'user-1', { status: 'draft' });

      expect(mockPrisma.annotation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ version: { increment: 1 } }),
        })
      );
    });

    it('invalidates cache after successful update', async () => {
      mockPrisma.annotation.findUnique.mockResolvedValue(mockAnnotation());
      mockPrisma.annotation.update.mockResolvedValue(mockAnnotation());

      await service.update('ann-1', 'user-1', { status: 'approved' });

      expect(mockRedis.del).toHaveBeenCalledWith('image:img-1:annotations');
      expect(mockRedis.del).toHaveBeenCalledWith('dataset:ds-1:summary');
    });
  });

  // -------------------------------------------------------------------------
  // create — cache invalidation
  // -------------------------------------------------------------------------

  describe('create', () => {
    it('invalidates both cache keys after create', async () => {
      mockImages.verifyOwnership.mockResolvedValue({
        image: { id: 'img-1', width: 800, height: 600 },
        datasetId: 'ds-1',
        projectId: 'proj-1',
      });
      mockPrisma.labelClass.findFirst.mockResolvedValue({ id: 'lc-1' });
      mockPrisma.annotation.create.mockResolvedValue({ id: 'ann-new' });

      await service.create('img-1', 'user-1', {
        labelClassId: 'lc-1',
        x: 0,
        y: 0,
        width: 50,
        height: 50,
      });

      expect(mockRedis.del).toHaveBeenCalledWith('image:img-1:annotations');
      expect(mockRedis.del).toHaveBeenCalledWith('dataset:ds-1:summary');
    });
  });
});
