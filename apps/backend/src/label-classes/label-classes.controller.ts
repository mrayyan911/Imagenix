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
} from '@nestjs/common';
import { LabelClassesService } from './label-classes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateLabelClassDto } from './dto/create-label-class.dto';

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
  async findAll(@Param('projectId') projectId: string, @CurrentUser() user: JwtPayload) {
    return this.labelClassesService.findAllByProject(projectId, user.sub);
  }

  @Delete(':classId')
  @HttpCode(HttpStatus.OK)
  async delete(
    @Param('projectId') projectId: string,
    @Param('classId') classId: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.labelClassesService.delete(classId, projectId, user.sub);
  }
}
