import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth-store';
import { useDeploymentStore } from '@/stores/deployment-store';
import { toast } from 'sonner';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  startDeployment: (deploymentId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token, isAuthenticated } = useAuthStore();
  const { updateDeployment, updateStep, setIsDeploying } = useDeploymentStore();

  useEffect(() => {
    if (isAuthenticated && token) {
      const newSocket = io('http://localhost:3001', {
        auth: { token },
      });

      newSocket.on('connect', () => {
        console.log('Connected to server');
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setIsConnected(false);
      });

      newSocket.on('deployment-status', (data) => {
        updateDeployment(data.deploymentId, { status: data.status });
        if (data.status === 'RUNNING') {
          setIsDeploying(true);
        }
      });

      newSocket.on('step-update', (data) => {
        updateStep(data.deploymentId, data.stepId, { status: data.status });
      });

      newSocket.on('deployment-complete', (data) => {
        updateDeployment(data.deploymentId, {
          status: data.status,
          duration: data.duration,
          completedAt: new Date().toISOString(),
        });
        setIsDeploying(false);
        
        if (data.status === 'COMPLETED') {
          toast.success('Deployment completed successfully!', {
            description: data.serverInfo 
              ? `Server available at ${data.serverInfo.ip}:${data.serverInfo.port}`
              : 'Your Minecraft server is ready!',
          });
        } else {
          toast.error('Deployment failed', {
            description: data.message || 'Please check the logs for more details',
          });
        }
      });

      newSocket.on('deployment-error', (data) => {
        toast.error('Deployment Error', {
          description: data.error,
        });
        setIsDeploying(false);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
        setSocket(null);
        setIsConnected(false);
      };
    }
  }, [isAuthenticated, token, updateDeployment, updateStep, setIsDeploying]);

  const startDeployment = (deploymentId: string) => {
    if (socket) {
      socket.emit('start-deployment', { deploymentId });
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, startDeployment }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}