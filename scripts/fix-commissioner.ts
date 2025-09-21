import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixCommissioner() {
  try {
    const nicholas = await prisma.user.findFirst({
      where: { email: 'nicholas.damato@astralfield.com' }
    });
    
    if (nicholas) {
      await prisma.user.update({
        where: { id: nicholas.id },
        data: { role: 'COMMISSIONER' }
      });
      console.log('✅ Nicholas D\'Amato set as COMMISSIONER');
      
      // Also update league commissioner
      const league = await prisma.league.findFirst({
        where: { season: 2025 }
      });
      
      if (league) {
        await prisma.league.update({
          where: { id: league.id },
          data: { commissionerId: nicholas.id }
        });
        console.log('✅ League commissioner updated');
      }
    } else {
      console.log('❌ Nicholas not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCommissioner();