import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateProjectDto, UpdateProjectDto } from './dto/projects.dto';
import { ProjectsService } from './projects.service';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private svc: ProjectsService) {}

  /** GET /api/projects */
  @Get()
  findAll(@Req() req: any) {
    return this.svc.findAll(req.user.id);
  }

  /** GET /api/projects/:id */
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.svc.findOne(id, req.user.id);
  }

  /** POST /api/projects */
  @Post()
  create(@Body() dto: CreateProjectDto, @Req() req: any) {
    return this.svc.create(req.user.id, dto);
  }

  /** PATCH /api/projects/:id */
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto, @Req() req: any) {
    return this.svc.update(id, req.user.id, dto);
  }

  /** DELETE /api/projects/:id */
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.svc.remove(id, req.user.id);
  }

  /** POST /api/projects/:id/duplicate */
  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @Req() req: any) {
    return this.svc.duplicate(id, req.user.id);
  }
}
