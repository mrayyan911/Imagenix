import { Module } from '@nestjs/common';
import { AugmentationController } from './augmentation.controller';
import { AugmentationService } from './augmentation.service';
import { ClassicalAugmentationService } from './classical-augmentation.service';
import { GenerativeAugmentationService } from './generative-augmentation.service';
import { DatasetsModule } from '../datasets/datasets.module';
import { ImagesModule } from '../images/images.module';

@Module({
  imports: [DatasetsModule, ImagesModule],
  controllers: [AugmentationController],
  providers: [
    AugmentationService,
    ClassicalAugmentationService,
    GenerativeAugmentationService,
  ],
  exports: [AugmentationService],
})
export class AugmentationModule {}
