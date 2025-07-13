import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { simulateDeployment } from '../utils/deployment.js';

const JWT_SECRET = process.env.JWT_SECRET || 'pterodeploy-secret-key';

export function setupSocketHandlers(io: Server, prisma: PrismaClient) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        return next(new Error('Authentication error'));
      }
      
      socket.userId = decoded.userId;
      next();
    });
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected`);

    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Handle deployment start
    socket.on('start-deployment', async (data) => {
      try {
        const { deploymentId } = data;
        
        // Verify deployment belongs to user
        const deployment = await prisma.deployment.findFirst({
          where: {
            id: deploymentId,
            userId: socket.userId,
          },
          include: {
            steps: {
              orderBy: { order: 'asc' },
            },
          },
        });

        if (!deployment) {
          socket.emit('deployment-error', { error: 'Deployment not found' });
          return;
        }

        // Start deployment simulation
        await simulateDeployment(deployment, prisma, io, socket.userId);
        
      } catch (error) {
        console.error('Deployment start error:', error);
        socket.emit('deployment-error', { error: 'Failed to start deployment' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
    });
  });
}