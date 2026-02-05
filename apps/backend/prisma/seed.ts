import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const passwordHash = await bcrypt.hash('Demo123!', 12);
  
  let demoUser = await prisma.user.findUnique({
    where: { email: 'demo@imagenix.ai' },
  });

  if (!demoUser) {
    demoUser = await prisma.user.create({
      data: {
        email: 'demo@imagenix.ai',
        passwordHash,
        fullName: 'Demo User',
        role: 'user',
        emailVerified: true,
        plan: 'pro',
      },
    });
  }

  console.log(`✅ Created demo user: ${demoUser.email}`);

  // Create demo project
  let demoProject = await prisma.project.findFirst({
    where: {
      userId: demoUser.id,
      name: 'Sample Object Detection',
    },
  });

  if (!demoProject) {
    demoProject = await prisma.project.create({
      data: {
        userId: demoUser.id,
        name: 'Sample Object Detection',
        description: 'A sample project for demonstrating Imagenix features',
        domainPolicy: 'standard',
      },
    });
  }

  console.log(`✅ Created demo project: ${demoProject.name}`);

  // Create label classes
  const labelClasses = [
    { name: 'person', colorHex: '#3B82F6' },
    { name: 'car', colorHex: '#10B981' },
    { name: 'dog', colorHex: '#F59E0B' },
    { name: 'cat', colorHex: '#EF4444' },
    { name: 'bicycle', colorHex: '#8B5CF6' },
  ];

  for (const labelClass of labelClasses) {
    const existing = await prisma.labelClass.findFirst({
      where: {
        projectId: demoProject.id,
        name: labelClass.name,
      },
    });

    if (!existing) {
      await prisma.labelClass.create({
        data: {
          projectId: demoProject.id,
          name: labelClass.name,
          colorHex: labelClass.colorHex,
        },
      });
    }
  }

  console.log(`✅ Created ${labelClasses.length} label classes`);

  // Create demo dataset
  let demoDataset = await prisma.dataset.findFirst({
    where: {
      projectId: demoProject.id,
      name: 'Training Set',
    },
  });

  if (!demoDataset) {
    demoDataset = await prisma.dataset.create({
      data: {
        projectId: demoProject.id,
        name: 'Training Set',
        status: 'active',
      },
    });
  }

  console.log(`✅ Created demo dataset: ${demoDataset.name}`);

  console.log('');
  console.log('🎉 Seeding completed!');
  console.log('');
  console.log('Demo credentials:');
  console.log('  Email: demo@imagenix.ai');
  console.log('  Password: Demo123!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
