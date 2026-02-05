import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { AutoAnnotationService } from './auto-annotation.service';
import { DatasetsModule } from '../datasets/datasets.module';
import { LabelClassesModule } from '../label-classes/label-classes.module';

@Module({
  imports: [DatasetsModule, LabelClassesModule],
  controllers: [JobsController],
  providers: [JobsService, AutoAnnotationService],
  exports: [JobsService],
})
export class JobsModule {}
