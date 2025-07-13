import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get all templates
router.get('/', async (req, res) => {
  try {
    const { category, featured } = req.query;
    
    const whereClause: any = {};
    
    if (category && category !== 'all') {
      whereClause.category = category;
    }
    
    if (featured === 'true') {
      whereClause.featured = true;
    }

    const templates = await prisma.template.findMany({
      where: whereClause,
      orderBy: [
        { featured: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({ templates });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get template by ID
router.get('/:id', async (req, res) => {
  try {
    const template = await prisma.template.findUnique({
      where: { id: req.params.id },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ template });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;