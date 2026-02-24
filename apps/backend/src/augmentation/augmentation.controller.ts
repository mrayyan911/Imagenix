import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { AugmentationService } from './augmentation.service';
import { 
  CreateClassicalAugmentationDto, 
  CreateGenerativeAugmentationDto,
  CreateRandomAugmentationDto,
  PreviewRandomAugmentationDto,
} from './dto/create-augmentation-job.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class AugmentationController {
  constructor(private augmentationService: AugmentationService) {}

  /**
   * Get augmentation capabilities
   */
  @Get('augmentation/capabilities')
  getCapabilities() {
    return this.augmentationService.getCapabilities();
  }

  /**
   * Create classical augmentation job
   */
  @Post('datasets/:datasetId/augmentation/classical')
  createClassicalAugmentation(
    @Param('datasetId') datasetId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateClassicalAugmentationDto
  ) {
    return this.augmentationService.createClassicalAugmentationJob(datasetId, user.sub, dto);
  }

  /**
   * Create generative augmentation job
   */
  @Post('datasets/:datasetId/augmentation/generative')
  createGenerativeAugmentation(
    @Param('datasetId') datasetId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateGenerativeAugmentationDto
  ) {
    return this.augmentationService.createGenerativeAugmentationJob(datasetId, user.sub, dto);
  }

  /**
   * Create random augmentation job
   */
  @Post('datasets/:datasetId/augmentation/random')
  createRandomAugmentation(
    @Param('datasetId') datasetId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRandomAugmentationDto
  ) {
    return this.augmentationService.createRandomAugmentationJob(datasetId, user.sub, dto);
  }

  /**
   * Preview classical augmentation on a single image
   */
  @Post('images/:imageId/augmentation/preview')
  previewAugmentation(
    @Param('imageId') imageId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { transforms: { type: string; value?: number }[] }
  ) {
    return this.augmentationService.previewClassicalAugmentation(imageId, user.sub, body.transforms);
  }

  /**
   * Preview random augmentation on a single image
   */
  @Post('images/:imageId/augmentation/random/preview')
  previewRandomAugmentation(
    @Param('imageId') imageId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: PreviewRandomAugmentationDto
  ) {
    return this.augmentationService.previewRandomAugmentation(
      imageId, 
      user.sub, 
      dto.strength, 
      dto.seed
    );
  }
}
