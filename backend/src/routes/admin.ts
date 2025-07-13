import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to check admin role
const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get all users (admin only)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            deployments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve user
router.post('/users/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, status: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.status === 'approved') {
      return res.status(400).json({ error: 'User is already approved' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: 'approved' },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    res.json({
      message: `User ${user.username} has been approved`,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject user
router.post('/users/:id/reject', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, status: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Cannot reject admin users' });
    }

    if (user.status === 'rejected') {
      return res.status(400).json({ error: 'User is already rejected' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: 'rejected' },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    res.json({
      message: `User ${user.username} has been rejected`,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Cannot delete admin users' });
    }

    // Delete user's deployments first (cascade)
    await prisma.deployment.deleteMany({
      where: { userId: id },
    });

    // Delete user
    await prisma.user.delete({
      where: { id },
    });

    res.json({
      message: `User ${user.username} has been deleted`,
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Promote user to admin
router.post('/users/:id/promote', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, role: true, status: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ error: 'User is already an admin' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { 
        role: 'admin',
        status: 'approved', // Ensure admin is approved
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    res.json({
      message: `User ${user.username} has been promoted to admin`,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Promote user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get admin dashboard stats
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      pendingUsers,
      approvedUsers,
      rejectedUsers,
      totalDeployments,
      activeDeployments,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'pending' } }),
      prisma.user.count({ where: { status: 'approved' } }),
      prisma.user.count({ where: { status: 'rejected' } }),
      prisma.deployment.count(),
      prisma.deployment.count({ where: { status: 'running' } }),
    ]);

    res.json({
      stats: {
        users: {
          total: totalUsers,
          pending: pendingUsers,
          approved: approvedUsers,
          rejected: rejectedUsers,
        },
        deployments: {
          total: totalDeployments,
          active: activeDeployments,
        },
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;