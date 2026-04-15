import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity } from '../database/entities/project.entity';
import { TaskEntity } from '../database/entities/task.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectEntity)
    private projectsRepo: Repository<ProjectEntity>,
    @InjectRepository(TaskEntity)
    private tasksRepo: Repository<TaskEntity>,
  ) {}

  async findAll(userId: string): Promise<ProjectEntity[]> {
    return this.projectsRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(userId: string, name: string, description?: string): Promise<ProjectEntity> {
    const project = this.projectsRepo.create({ userId, name, description });
    return this.projectsRepo.save(project);
  }

  async update(userId: string, projectId: string, name: string): Promise<ProjectEntity> {
    const project = await this.projectsRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.userId !== userId) throw new ForbiddenException('无权操作');
    project.name = name;
    return this.projectsRepo.save(project);
  }

  async remove(userId: string, projectId: string): Promise<void> {
    const project = await this.projectsRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.userId !== userId) throw new ForbiddenException('无权操作');

    // Remove project reference from tasks but keep tasks
    await this.tasksRepo.update({ projectId }, { projectId: null as any });
    await this.projectsRepo.remove(project);
  }
}
