import { create } from 'zustand';

export interface DeploymentStep {
  id: string;
  name: string;
  description: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  startedAt?: string;
  completedAt?: string;
  logs?: string;
  order: number;
}

export interface Deployment {
  id: string;
  modpackName: string;
  modpackUrl: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  logs?: string;
  errorMsg?: string;
  steps?: DeploymentStep[];
}

interface DeploymentState {
  deployments: Deployment[];
  currentDeployment: Deployment | null;
  isDeploying: boolean;
  setDeployments: (deployments: Deployment[]) => void;
  addDeployment: (deployment: Deployment) => void;
  updateDeployment: (id: string, updates: Partial<Deployment>) => void;
  updateStep: (deploymentId: string, stepId: string, updates: Partial<DeploymentStep>) => void;
  setCurrentDeployment: (deployment: Deployment | null) => void;
  setIsDeploying: (isDeploying: boolean) => void;
}

export const useDeploymentStore = create<DeploymentState>((set, get) => ({
  deployments: [],
  currentDeployment: null,
  isDeploying: false,
  
  setDeployments: (deployments) => set({ deployments }),
  
  addDeployment: (deployment) =>
    set((state) => ({
      deployments: [deployment, ...state.deployments],
    })),
  
  updateDeployment: (id, updates) =>
    set((state) => ({
      deployments: state.deployments.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
      currentDeployment:
        state.currentDeployment?.id === id
          ? { ...state.currentDeployment, ...updates }
          : state.currentDeployment,
    })),
  
  updateStep: (deploymentId, stepId, updates) =>
    set((state) => ({
      deployments: state.deployments.map((d) =>
        d.id === deploymentId
          ? {
              ...d,
              steps: d.steps?.map((s) =>
                s.id === stepId ? { ...s, ...updates } : s
              ),
            }
          : d
      ),
      currentDeployment:
        state.currentDeployment?.id === deploymentId
          ? {
              ...state.currentDeployment,
              steps: state.currentDeployment.steps?.map((s) =>
                s.id === stepId ? { ...s, ...updates } : s
              ),
            }
          : state.currentDeployment,
    })),
  
  setCurrentDeployment: (deployment) => set({ currentDeployment: deployment }),
  
  setIsDeploying: (isDeploying) => set({ isDeploying }),
}));