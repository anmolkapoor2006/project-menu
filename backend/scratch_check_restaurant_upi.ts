import prisma from './src/prisma';

async function main() {
  const rest = await prisma.restaurant.findFirst({
    where: { slug: 'anmols-cafe' }
  });

  if (!rest) {
    console.log('Restaurant anmols-cafe not found');
    return;
  }

  console.log('Restaurant Details:');
  console.log('  ID:', rest.id);
  console.log('  Name:', rest.name);
  console.log('  Slug:', rest.slug);
  console.log('  upiId:', rest.upiId);
  console.log('  upiPayeeName:', rest.upiPayeeName);
  console.log('  upiQrImageUrl:', rest.upiQrImageUrl);
}

main().catch(console.error).finally(() => prisma.$disconnect());
