import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

const mockProjectsService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  duplicate: jest.fn(),
};

describe('ProjectsController', () => {
  let controller: ProjectsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [{ provide: ProjectsService, useValue: mockProjectsService }],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
  });

  const req = { user: { id: 'user-1' } };

  describe('findAll', () => {
    it('should call service.findAll with user id', async () => {
      mockProjectsService.findAll.mockResolvedValue([]);

      await controller.findAll(req);

      expect(mockProjectsService.findAll).toHaveBeenCalledWith('user-1');
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with project id and user id', async () => {
      mockProjectsService.findOne.mockResolvedValue({ id: 'proj-1' });

      await controller.findOne('proj-1', req);

      expect(mockProjectsService.findOne).toHaveBeenCalledWith(
        'proj-1',
        'user-1',
      );
    });
  });

  describe('create', () => {
    it('should call service.create with user id and dto', async () => {
      const dto = { name: 'New Project', clientData: 'Client' };
      mockProjectsService.create.mockResolvedValue({
        id: 'proj-new',
        ...dto,
      });

      await controller.create(dto, req);

      expect(mockProjectsService.create).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('update', () => {
    it('should call service.update with correct params', async () => {
      const dto = { name: 'Updated' };
      mockProjectsService.update.mockResolvedValue({ id: 'proj-1', ...dto });

      await controller.update('proj-1', dto, req);

      expect(mockProjectsService.update).toHaveBeenCalledWith(
        'proj-1',
        'user-1',
        dto,
      );
    });
  });

  describe('remove', () => {
    it('should call service.remove with correct params', async () => {
      mockProjectsService.remove.mockResolvedValue({ id: 'proj-1' });

      await controller.remove('proj-1', req);

      expect(mockProjectsService.remove).toHaveBeenCalledWith(
        'proj-1',
        'user-1',
      );
    });
  });

  describe('duplicate', () => {
    it('should call service.duplicate with correct params', async () => {
      mockProjectsService.duplicate.mockResolvedValue({ id: 'proj-copy' });

      await controller.duplicate('proj-1', req);

      expect(mockProjectsService.duplicate).toHaveBeenCalledWith(
        'proj-1',
        'user-1',
      );
    });
  });
});
