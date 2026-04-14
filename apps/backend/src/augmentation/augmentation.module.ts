import { Module } from '@nestjs/common';
import { AugmentationController } from './augmentation.controller';
import { AugmentationService } from './augmentation.service';
import { ClassicalAugmentationService } from './classical-augmentation.service';
import { GenerativeAugmentationService } from './generative-augmentation.service';
import { RandomAugmentationService } from './random-augmentation.service';
import { RunPodProvider } from './providers/runpod.provider';
import { ReplicateProvider } from './providers/replicate.provider';
import { DatasetsModule } from '../datasets/datasets.module';
import { ImagesModule } from '../images/images.module';

@Module({
  imports: [DatasetsModule, ImagesModule],
  controllers: [AugmentationController],
  providers: [
    AugmentationService,
    ClassicalAugmentationService,
    GenerativeAugmentationService,
    RandomAugmentationService,
    RunPodProvider,
    ReplicateProvider,
  ],
  exports: [AugmentationService],
})
export class AugmentationModule {}
