import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { DatasetsService } from './datasets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateDatasetDto } from './dto/create-dataset.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class DatasetsController {
  constructor(private datasetsService: DatasetsService) {}

  @Post('projects/:projectId/datasets')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('projectId') projectId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDatasetDto
  ) {
    return this.datasetsService.create(projectId, user.sub, dto);
  }

  @SkipThrottle()
  @Get('datasets/:id')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.datasetsService.findOne(id, user.sub);
  }
}
