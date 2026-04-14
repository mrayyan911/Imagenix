import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { LabelClassesService } from './label-classes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateLabelClassDto } from './dto/create-label-class.dto';
import { DeleteAnnotationsFromImagesDto } from './dto/delete-annotations-from-images.dto';

@Controller('projects/:projectId/classes')
@UseGuards(JwtAuthGuard)
export class LabelClassesController {
  constructor(private labelClassesService: LabelClassesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('projectId') projectId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateLabelClassDto
  ) {
    return this.labelClassesService.create(projectId, user.sub, dto);
  }

  @Get()
  async findAll(
    @Param('projectId') projectId: string,
    @CurrentUser() user: JwtPayload,
    @Query('includeCounts') includeCounts?: string
  ) {
    if (includeCounts === 'true') {
      return this.labelClassesService.findAllByProjectWithCounts(projectId, user.sub);
    }
    return this.labelClassesService.findAllByProject(projectId, user.sub);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async deleteAll(@Param('projectId') projectId: string, @CurrentUser() user: JwtPayload) {
    return this.labelClassesService.deleteAll(projectId, user.sub);
  }

  @Delete(':classId')
  @HttpCode(HttpStatus.OK)
  async delete(
    @Param('projectId') projectId: string,
    @Param('classId') classId: string,
    @CurrentUser() user: JwtPayload,
    @Query('force') force?: string
  ) {
    if (force === 'true') {
      return this.labelClassesService.deleteWithAnnotations(classId, projectId, user.sub);
    }
    return this.labelClassesService.delete(classId, projectId, user.sub);
  }

  @Post('annotations/delete-from-images')
  @HttpCode(HttpStatus.OK)
  async deleteAnnotationsFromImages(
    @Param('projectId') projectId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: DeleteAnnotationsFromImagesDto
  ) {
    return this.labelClassesService.deleteAnnotationsFromSelectedImages(
      projectId,
      user.sub,
      dto.imageIds,
      dto.labelClassIds
    );
  }
}
