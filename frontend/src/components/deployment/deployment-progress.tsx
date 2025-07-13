import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Deployment, DeploymentStep } from '@/stores/deployment-store';
import { formatDistanceToNow } from 'date-fns';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Server,
  Users,
} from 'lucide-react';
import { useState } from 'react';

interface DeploymentProgressProps {
  deployment: Deployment;
}

export function DeploymentProgress({ deployment }: DeploymentProgressProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleStep = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const getStepIcon = (status: DeploymentStep['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'RUNNING':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'FAILED':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: Deployment['status']) => {
    const variants = {
      PENDING: 'secondary',
      RUNNING: 'default',
      COMPLETED: 'default',
      FAILED: 'destructive',
      CANCELLED: 'secondary',
    } as const;

    const colors = {
      PENDING: 'text-yellow-600',
      RUNNING: 'text-blue-600',
      COMPLETED: 'text-green-600',
      FAILED: 'text-red-600',
      CANCELLED: 'text-gray-600',
    } as const;

    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {status.toLowerCase()}
      </Badge>
    );
  };

  const completedSteps = deployment.steps?.filter(step => step.status === 'COMPLETED').length || 0;
  const totalSteps = deployment.steps?.length || 0;
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              {deployment.modpackName}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Started {formatDistanceToNow(new Date(deployment.startedAt), { addSuffix: true })}
            </p>
          </div>
          {getStatusBadge(deployment.status)}
        </div>

        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{completedSteps}/{totalSteps} steps</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Server Info (if completed) */}
        {deployment.status === 'COMPLETED' && deployment.duration && (
          <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Server Ready!</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Server IP:</span>
                <code className="bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
                  {deployment.modpackName.toLowerCase().replace(/\s+/g, '-')}.pterodeploy.com:25565
                </code>
              </div>
              <div className="flex justify-between">
                <span>Players:</span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  0/20
                </span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span>{Math.floor(deployment.duration / 60)}m {deployment.duration % 60}s</span>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          {deployment.steps?.map((step) => (
            <Collapsible key={step.id}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-3 h-auto"
                  onClick={() => toggleStep(step.id)}
                >
                  <div className="flex items-center gap-3">
                    {getStepIcon(step.status)}
                    <div className="text-left">
                      <div className="font-medium">{step.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {step.description}
                      </div>
                    </div>
                  </div>
                  {expandedSteps.has(step.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="ml-7 pl-4 border-l-2 border-muted pb-2">
                  <div className="text-sm space-y-1">
                    {step.startedAt && (
                      <div className="text-muted-foreground">
                        Started: {formatDistanceToNow(new Date(step.startedAt), { addSuffix: true })}
                      </div>
                    )}
                    
                    {step.logs && (
                      <div className="bg-muted p-2 rounded text-xs font-mono">
                        {JSON.parse(step.logs).map((log: string, index: number) => (
                          <div key={index}>{log}</div>
                        ))}
                      </div>
                    )}
                    
                    {step.status === 'RUNNING' && (
                      <div className="text-blue-600 dark:text-blue-400">
                        Step in progress...
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}