/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const plans = [
    {
      slug: 'free',
      name: 'Free',
      monthlyPrice: 0,
      yearlyPrice: 0,
      badgeFrom: '#6b4a2a',
      badgeTo: '#8b5a2b',
      chatLimit: 15,
      imageLimit: 2,
      audioLimit: 0,
      videoLimit: 0,
    },
    {
      slug: 'plus',
      name: 'Plus',
      monthlyPrice: 35,
      yearlyPrice: null,
      badgeFrom: '#c0c0c0',
      badgeTo: '#9ea1a7',
      chatLimit: null,
      imageLimit: null,
      audioLimit: 100,
      videoLimit: 40,
    },
    {
      slug: 'pro',
      name: 'Pro',
      monthlyPrice: 89,
      yearlyPrice: null,
      badgeFrom: '#d7d9e0',
      badgeTo: '#f5f7ff',
      chatLimit: null,
      imageLimit: null,
      audioLimit: null,
      videoLimit: null,
    },
    {
      slug: 'annual',
      name: 'Anual',
      monthlyPrice: 79, // effectively 950/12 ~ 79
      yearlyPrice: 950,
      badgeFrom: '#f5c542',
      badgeTo: '#f8e38a',
      chatLimit: null,
      imageLimit: null,
      audioLimit: null,
      videoLimit: null,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
  }

  console.log('Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
