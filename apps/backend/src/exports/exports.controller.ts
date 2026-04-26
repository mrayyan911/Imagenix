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
import { Throttle } from '@nestjs/throttler';
import { ExportsService } from './exports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateExportDto } from './dto/create-export.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class ExportsController {
  constructor(private exportsService: ExportsService) {}

  @Post('datasets/:datasetId/exports')
  @Throttle({ long: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  async createExport(
    @Param('datasetId') datasetId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateExportDto
  ) {
    return this.exportsService.createExport(datasetId, user.sub, dto);
  }

  @Get('exports/:id/download')
  async getExportDownload(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.exportsService.getExportDownload(id, user.sub);
  }

  @Get('datasets/:datasetId/exports')
  async getExportsByDataset(
    @Param('datasetId') datasetId: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.exportsService.getExportsByDataset(datasetId, user.sub);
  }
}
