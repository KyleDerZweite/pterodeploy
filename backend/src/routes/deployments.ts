import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import { createDeploymentPlan } from '../utils/deployment.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all deployments for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, search, limit = 20, offset = 0 } = req.query;
    
    const whereClause: any = { userId: req.user.userId };
    
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    
    if (search) {
      whereClause.modpackName = {
        contains: search as string,
      };
    }

    const deployments = await prisma.deployment.findMany({
      where: whereClause,
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    const total = await prisma.deployment.count({ where: whereClause });

    res.json({ deployments, total });
  } catch (error) {
    console.error('Get deployments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get deployment by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const deployment = await prisma.deployment.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.userId,
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    res.json({ deployment });
  } catch (error) {
    console.error('Get deployment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new deployment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { modpackUrl, modpackName } = req.body;

    if (!modpackUrl) {
      return res.status(400).json({ error: 'Modpack URL is required' });
    }

    // Extract modpack name from URL or use provided name
    const extractedName = modpackName || extractModpackName(modpackUrl);

    // Create deployment with initial steps
    const deployment = await prisma.deployment.create({
      data: {
        userId: req.user.userId,
        modpackName: extractedName,
        modpackUrl,
        status: 'PENDING',
      },
    });

    // Create deployment plan steps
    const steps = createDeploymentPlan(modpackUrl);
    
    await Promise.all(
      steps.map((step, index) =>
        prisma.deploymentStep.create({
          data: {
            deploymentId: deployment.id,
            name: step.name,
            description: step.description,
            status: 'PENDING',
            order: index,
          },
        })
      )
    );

    // Return deployment with steps
    const fullDeployment = await prisma.deployment.findUnique({
      where: { id: deployment.id },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    res.status(201).json({ deployment: fullDeployment });
  } catch (error) {
    console.error('Create deployment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete deployment
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const deployment = await prisma.deployment.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.userId,
      },
    });

    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    await prisma.deployment.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Deployment deleted successfully' });
  } catch (error) {
    console.error('Delete deployment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function extractModpackName(url: string): string {
  // Extract modpack name from various URL formats
  if (url.includes('curseforge.com')) {
    const match = url.match(/\/projects\/([^\/]+)/);
    return match ? match[1].replace(/-/g, ' ') : 'Unknown Modpack';
  }
  
  if (url.includes('modrinth.com')) {
    const match = url.match(/\/project\/([^\/]+)/);
    return match ? match[1].replace(/-/g, ' ') : 'Unknown Modpack';
  }
  
  // Generic extraction
  const match = url.match(/\/([^\/]+)\/?$/);
  return match ? match[1].replace(/[-_]/g, ' ') : 'Unknown Modpack';
}

export default router;