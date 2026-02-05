import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

// Core modules
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';

// Feature modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { DatasetsModule } from './datasets/datasets.module';
import { ImagesModule } from './images/images.module';
import { AnnotationsModule } from './annotations/annotations.module';
import { JobsModule } from './jobs/jobs.module';
import { ExportsModule } from './exports/exports.module';
import { LabelClassesModule } from './label-classes/label-classes.module';
import { HealthModule } from './health/health.module';
import { AugmentationModule } from './augmentation/augmentation.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 50,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Core modules
    PrismaModule,
    RedisModule,
    StorageModule,

    // Feature modules
    AuthModule,
    UsersModule,
    ProjectsModule,
    DatasetsModule,
    ImagesModule,
    AnnotationsModule,
    LabelClassesModule,
    JobsModule,
    ExportsModule,
    HealthModule,
    AugmentationModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
