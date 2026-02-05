import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('ProjectsService', () => {
  let service: ProjectsService;

  const mockPrismaService = {
    project: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new project', async () => {
      const userId = 'user-id';
      const dto = { name: 'Test Project', description: 'Test description' };

      mockPrismaService.project.findUnique.mockResolvedValue(null);
      mockPrismaService.project.create.mockResolvedValue({
        id: 'project-id',
        ...dto,
        userId,
      });

      const result = await service.create(userId, dto);

      expect(result).toEqual({ projectId: 'project-id' });
      expect(mockRedisService.del).toHaveBeenCalledWith(`user:${userId}:projects`);
    });

    it('should throw ConflictException if project name exists', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.create('user-id', { name: 'Existing Project' })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return project with details', async () => {
      const mockProject = {
        id: 'project-id',
        userId: 'user-id',
        name: 'Test Project',
        description: 'Test',
        domainPolicy: 'standard',
        createdAt: new Date(),
        updatedAt: new Date(),
        labelClasses: [],
        datasets: [],
      };

      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);

      const result = await service.findOne('project-id', 'user-id');

      expect(result.project.id).toBe('project-id');
    });

    it('should throw NotFoundException if project not found', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', 'user-id')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException if user does not own project', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'project-id',
        userId: 'other-user-id',
      });

      await expect(service.findOne('project-id', 'user-id')).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('delete', () => {
    it('should delete a project', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'project-id',
        userId: 'user-id',
      });
      mockPrismaService.project.delete.mockResolvedValue({});

      const result = await service.delete('project-id', 'user-id');

      expect(result).toEqual({ success: true });
    });
  });
});
