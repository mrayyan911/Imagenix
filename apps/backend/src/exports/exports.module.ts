import { Module } from '@nestjs/common';
import { ExportsService } from './exports.service';
import { ExportsController } from './exports.controller';
import { ExportGeneratorService } from './export-generator.service';
import { DatasetsModule } from '../datasets/datasets.module';

@Module({
  imports: [DatasetsModule],
  controllers: [ExportsController],
  providers: [ExportsService, ExportGeneratorService],
  exports: [ExportsService],
})
export class ExportsModule {}
