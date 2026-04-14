import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { AutoAnnotationService } from './auto-annotation.service';
import { DatasetsModule } from '../datasets/datasets.module';
import { LabelClassesModule } from '../label-classes/label-classes.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [DatasetsModule, LabelClassesModule, StorageModule, ConfigModule],
  controllers: [JobsController],
  providers: [JobsService, AutoAnnotationService],
  exports: [JobsService],
})
export class JobsModule {}
