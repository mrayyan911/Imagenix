import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AnnotationsService } from './annotations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateAnnotationDto } from './dto/create-annotation.dto';
import { UpdateAnnotationDto } from './dto/update-annotation.dto';
import { BulkUpdateAnnotationsDto } from './dto/bulk-update-annotations.dto';
import { FindAnnotationsQueryDto } from './dto/find-annotations-query.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class AnnotationsController {
  constructor(private annotationsService: AnnotationsService) {}

  @Post('images/:imageId/annotations')
  @Throttle({ long: { limit: 120, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('imageId') imageId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAnnotationDto
  ) {
    return this.annotationsService.create(imageId, user.sub, dto);
  }

  @SkipThrottle()
  @Get('images/:imageId/annotations')
  async findByImage(
    @Param('imageId') imageId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: FindAnnotationsQueryDto
  ) {
    return this.annotationsService.findByImage(imageId, user.sub, query);
  }

  @Patch('annotations/:id')
  @Throttle({ long: { limit: 120, ttl: 60000 } })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateAnnotationDto
  ) {
    return this.annotationsService.update(id, user.sub, dto);
  }

  @Post('annotations/bulk-update')
  @Throttle({ long: { limit: 20, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async bulkUpdate(@CurrentUser() user: JwtPayload, @Body() dto: BulkUpdateAnnotationsDto) {
    return this.annotationsService.bulkUpdateStatus(user.sub, dto);
  }

  @Delete('annotations/:id')
  @Throttle({ long: { limit: 120, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.annotationsService.delete(id, user.sub);
  }
}
