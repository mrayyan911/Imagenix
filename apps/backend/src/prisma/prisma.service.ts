import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('cleanDatabase can only be called in test environment');
    }
    
    // Delete in correct order to respect foreign keys
    await this.annotation.deleteMany();
    await this.image.deleteMany();
    await this.datasetVersion.deleteMany();
    await this.export.deleteMany();
    await this.job.deleteMany();
    await this.dataset.deleteMany();
    await this.labelClass.deleteMany();
    await this.project.deleteMany();
    await this.session.deleteMany();
    await this.user.deleteMany();
  }
}
