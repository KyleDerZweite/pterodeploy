import { PrismaClient, Deployment, DeploymentStep } from '@prisma/client';
import { Server } from 'socket.io';

interface DeploymentPlan {
  name: string;
  description: string;
  estimatedDuration: number; // in seconds
}

export function createDeploymentPlan(modpackUrl: string): DeploymentPlan[] {
  const isLarge = modpackUrl.includes('rlcraft') || modpackUrl.includes('all-the-mods');
  const isTech = modpackUrl.includes('tekkit') || modpackUrl.includes('industrialcraft');
  
  const basePlan: DeploymentPlan[] = [
    {
      name: 'Validate URL',
      description: 'Checking modpack URL and extracting metadata',
      estimatedDuration: 3,
    },
    {
      name: 'Download Modpack',
      description: 'Downloading modpack files and dependencies',
      estimatedDuration: isLarge ? 45 : 20,
    },
    {
      name: 'Extract Files',
      description: 'Extracting modpack archive and organizing files',
      estimatedDuration: 10,
    },
    {
      name: 'Install Forge/Fabric',
      description: 'Setting up mod loader and dependencies',
      estimatedDuration: 15,
    },
    {
      name: 'Configure Server',
      description: 'Applying server configurations and settings',
      estimatedDuration: 8,
    },
    {
      name: 'Allocate Resources',
      description: 'Setting up server resources and memory allocation',
      estimatedDuration: 5,
    },
    {
      name: 'Start Server',
      description: 'Starting Minecraft server and running initial checks',
      estimatedDuration: 20,
    },
  ];

  if (isTech) {
    basePlan.splice(4, 0, {
      name: 'Install Tech Mods',
      description: 'Installing and configuring technical mod dependencies',
      estimatedDuration: 12,
    });
  }

  return basePlan;
}

export async function simulateDeployment(
  deployment: Deployment & { steps: DeploymentStep[] },
  prisma: PrismaClient,
  io: Server,
  userId: string
) {
  const startTime = Date.now();
  
  // Update deployment status to running
  await prisma.deployment.update({
    where: { id: deployment.id },
    data: { status: 'RUNNING' },
  });

  io.to(`user:${userId}`).emit('deployment-status', {
    deploymentId: deployment.id,
    status: 'RUNNING',
    message: 'Deployment started',
  });

  // Simulate random failure chance (20%)
  const shouldFail = Math.random() < 0.2;
  const failAtStep = shouldFail ? Math.floor(Math.random() * deployment.steps.length) : -1;

  for (let i = 0; i < deployment.steps.length; i++) {
    const step = deployment.steps[i];
    
    // Update step to running
    await prisma.deploymentStep.update({
      where: { id: step.id },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    io.to(`user:${userId}`).emit('step-update', {
      deploymentId: deployment.id,
      stepId: step.id,
      status: 'RUNNING',
      message: `Started: ${step.name}`,
    });

    // Simulate step duration with some randomness
    const plan = createDeploymentPlan(deployment.modpackUrl);
    const estimatedDuration = plan[i]?.estimatedDuration || 10;
    const actualDuration = estimatedDuration + Math.random() * 5;
    
    await new Promise(resolve => setTimeout(resolve, actualDuration * 1000));

    // Check if this step should fail
    if (i === failAtStep) {
      await prisma.deploymentStep.update({
        where: { id: step.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          logs: JSON.stringify([
            'Error: Failed to download modpack',
            'Connection timeout after 30 seconds',
            'Please check your internet connection and try again',
          ]),
        },
      });

      await prisma.deployment.update({
        where: { id: deployment.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          duration: Math.floor((Date.now() - startTime) / 1000),
          errorMsg: `Deployment failed at step: ${step.name}`,
        },
      });

      io.to(`user:${userId}`).emit('step-update', {
        deploymentId: deployment.id,
        stepId: step.id,
        status: 'FAILED',
        message: `Failed: ${step.name}`,
        error: 'Connection timeout - please try again',
      });

      io.to(`user:${userId}`).emit('deployment-complete', {
        deploymentId: deployment.id,
        status: 'FAILED',
        message: 'Deployment failed',
        duration: Math.floor((Date.now() - startTime) / 1000),
      });

      return;
    }

    // Mark step as completed
    await prisma.deploymentStep.update({
      where: { id: step.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        logs: JSON.stringify([
          `Successfully completed ${step.name}`,
          `Duration: ${actualDuration.toFixed(1)}s`,
          'All checks passed ✓',
        ]),
      },
    });

    io.to(`user:${userId}`).emit('step-update', {
      deploymentId: deployment.id,
      stepId: step.id,
      status: 'COMPLETED',
      message: `Completed: ${step.name}`,
    });
  }

  // Mark deployment as completed
  const totalDuration = Math.floor((Date.now() - startTime) / 1000);
  
  await prisma.deployment.update({
    where: { id: deployment.id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      duration: totalDuration,
    },
  });

  io.to(`user:${userId}`).emit('deployment-complete', {
    deploymentId: deployment.id,
    status: 'COMPLETED',
    message: 'Deployment completed successfully!',
    duration: totalDuration,
    serverInfo: {
      ip: `${deployment.modpackName.toLowerCase().replace(/\s+/g, '-')}.pterodeploy.com`,
      port: 25565,
      players: '0/20',
    },
  });
}