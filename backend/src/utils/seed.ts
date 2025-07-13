import { PrismaClient } from '@prisma/client';

export async function seedDatabase(prisma: PrismaClient) {
  try {
    // Check if templates already exist
    const existingTemplates = await prisma.template.count();
    
    if (existingTemplates === 0) {
      console.log('Seeding database with initial data...');
      
      // Create sample templates
      await prisma.template.createMany({
        data: [
          {
            name: 'All The Mods 9',
            description: 'Kitchen sink modpack with 400+ mods featuring tech, magic, and adventure',
            modpackUrl: 'https://www.curseforge.com/minecraft/modpacks/all-the-mods-9',
            category: 'Kitchen Sink',
            featured: true,
          },
          {
            name: 'RLCraft',
            description: 'Hardcore survival modpack that transforms Minecraft into a brutal RPG',
            modpackUrl: 'https://www.curseforge.com/minecraft/modpacks/rlcraft',
            category: 'Adventure',
            featured: true,
          },
          {
            name: 'SkyFactory 4',
            description: 'The classic skyblock experience with automation and tech mods',
            modpackUrl: 'https://www.curseforge.com/minecraft/modpacks/skyfactory-4',
            category: 'Skyblock',
            featured: true,
          },
          {
            name: 'Enigmatica 6',
            description: 'Expert mode modpack focused on questing and progression',
            modpackUrl: 'https://www.curseforge.com/minecraft/modpacks/enigmatica6',
            category: 'Expert',
            featured: false,
          },
          {
            name: 'Better Minecraft',
            description: 'Enhanced vanilla experience with quality of life improvements',
            modpackUrl: 'https://www.curseforge.com/minecraft/modpacks/better-minecraft-modpack',
            category: 'Vanilla+',
            featured: false,
          },
          {
            name: 'Create: Above and Beyond',
            description: 'Automation-focused pack centered around the Create mod',
            modpackUrl: 'https://www.curseforge.com/minecraft/modpacks/create-above-and-beyond',
            category: 'Tech',
            featured: false,
          },
        ],
      });
      
      console.log('Database seeded successfully');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}