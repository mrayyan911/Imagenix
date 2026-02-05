import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ImagesService } from './images.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { GetUploadUrlDto } from './dto/get-upload-url.dto';
import { CommitImageDto } from './dto/commit-image.dto';
import { ImageListQueryDto } from './dto/image-list-query.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class ImagesController {
  constructor(private imagesService: ImagesService) {}

  @Post('datasets/:datasetId/images/upload-url')
  @HttpCode(HttpStatus.OK)
  async getUploadUrl(
    @Param('datasetId') datasetId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: GetUploadUrlDto
  ) {
    return this.imagesService.getUploadUrl(datasetId, user.sub, dto);
  }

  @Post('datasets/:datasetId/images/commit')
  @HttpCode(HttpStatus.CREATED)
  async commitImage(
    @Param('datasetId') datasetId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CommitImageDto
  ) {
    return this.imagesService.commitImage(datasetId, user.sub, dto);
  }

  @Get('datasets/:datasetId/images')
  async findAll(
    @Param('datasetId') datasetId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: ImageListQueryDto
  ) {
    return this.imagesService.findAllByDataset(datasetId, user.sub, query);
  }

  @Get('images/:id')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.imagesService.findOne(id, user.sub);
  }

  @Delete('images/:id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.imagesService.delete(id, user.sub);
  }
}
