import { Module } from '@nestjs/common';
import { LabelClassesService } from './label-classes.service';
import { LabelClassesController } from './label-classes.controller';
import { ProjectsModule } from '../projects/projects.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [ProjectsModule, RedisModule],
  controllers: [LabelClassesController],
  providers: [LabelClassesService],
  exports: [LabelClassesService],
})
export class LabelClassesModule {}
