import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AnnotationsService } from './annotations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateAnnotationDto } from './dto/create-annotation.dto';
import { UpdateAnnotationDto } from './dto/update-annotation.dto';
import { BulkUpdateAnnotationsDto } from './dto/bulk-update-annotations.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class AnnotationsController {
  constructor(private annotationsService: AnnotationsService) {}

  @Post('images/:imageId/annotations')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('imageId') imageId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAnnotationDto
  ) {
    return this.annotationsService.create(imageId, user.sub, dto);
  }

  @Get('images/:imageId/annotations')
  async findByImage(@Param('imageId') imageId: string, @CurrentUser() user: JwtPayload) {
    return this.annotationsService.findByImage(imageId, user.sub);
  }

  @Patch('annotations/:id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateAnnotationDto
  ) {
    return this.annotationsService.update(id, user.sub, dto);
  }

  @Post('annotations/bulk-update')
  @HttpCode(HttpStatus.OK)
  async bulkUpdate(@CurrentUser() user: JwtPayload, @Body() dto: BulkUpdateAnnotationsDto) {
    return this.annotationsService.bulkUpdateStatus(user.sub, dto);
  }

  @Delete('annotations/:id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.annotationsService.delete(id, user.sub);
  }
}
