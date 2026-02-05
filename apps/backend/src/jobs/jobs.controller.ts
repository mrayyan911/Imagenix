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
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateAutoAnnotationJobDto } from './dto/create-auto-annotation-job.dto';
import { Throttle } from '@nestjs/throttler';

@Controller()
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(private jobsService: JobsService) {}

  @Post('datasets/:datasetId/jobs/auto-annotate')
  @Throttle({ default: { limit: 30, ttl: 3600000 } }) // 30 per hour
  @HttpCode(HttpStatus.ACCEPTED)
  async createAutoAnnotationJob(
    @Param('datasetId') datasetId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAutoAnnotationJobDto
  ) {
    return this.jobsService.createAutoAnnotationJob(datasetId, user.sub, dto);
  }

  @Get('jobs/:id')
  async getJobStatus(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.jobsService.getJobStatus(id, user.sub);
  }

  @Post('jobs/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelJob(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.jobsService.cancelJob(id, user.sub);
  }

  @Get('datasets/:datasetId/jobs')
  async getJobsByDataset(
    @Param('datasetId') datasetId: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.jobsService.getJobsByDataset(datasetId, user.sub);
  }
}
