import { DeploymentChat } from '@/components/deployment/deployment-chat';

export function NewDeploymentPage() {
  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">New Deployment</h1>
        <p className="text-muted-foreground">
          Start a conversation to deploy your Minecraft server. Just share a modpack URL and I'll handle the rest!
        </p>
      </div>
      
      <DeploymentChat />
    </div>
  );
}