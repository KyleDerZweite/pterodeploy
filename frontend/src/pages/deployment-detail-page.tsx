import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DeploymentProgress } from '@/components/deployment/deployment-progress';
import { Deployment } from '@/stores/deployment-store';
import { api } from '@/lib/api';
import { formatDistanceToNow, format } from 'date-fns';
import {
  ArrowLeft,
  Server,
  Globe,
  Users,
  Clock,
  ExternalLink,
  Copy,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export function DeploymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchDeployment(id);
    }
  }, [id]);

  const fetchDeployment = async (deploymentId: string) => {
    try {
      setIsLoading(true);
      const response = await api.get(`/deployments/${deploymentId}`);
      setDeployment(response.data.deployment);
    } catch (error) {
      console.error('Failed to fetch deployment:', error);
      toast.error('Failed to load deployment details');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!deployment) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/deployments">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Deployments
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <h3 className="text-lg font-medium">Deployment not found</h3>
              <p className="text-muted-foreground">
                The deployment you're looking for doesn't exist or has been deleted.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const serverUrl = `${deployment.modpackName.toLowerCase().replace(/\s+/g, '-')}.pterodeploy.com`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/deployments">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Deployments
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{deployment.modpackName}</h1>
          <p className="text-muted-foreground">
            Deployment started {formatDistanceToNow(new Date(deployment.startedAt), { addSuffix: true })}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <DeploymentProgress deployment={deployment} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Server Info */}
          {deployment.status === 'COMPLETED' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Server Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Globe className="h-4 w-4" />
                    Server Address
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted px-3 py-2 rounded text-sm">
                      {serverUrl}:25565
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(`${serverUrl}:25565`)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Users className="h-4 w-4" />
                    Players Online
                  </div>
                  <div className="text-2xl font-bold">0/20</div>
                </div>

                <Separator />

                <Button className="w-full" asChild>
                  <a href={deployment.modpackUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Modpack Page
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Deployment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={deployment.status === 'COMPLETED' ? 'default' : 'secondary'}>
                  {deployment.status.toLowerCase()}
                </Badge>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Started</span>
                <span className="text-sm">
                  {format(new Date(deployment.startedAt), 'MMM d, yyyy HH:mm')}
                </span>
              </div>

              {deployment.completedAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <span className="text-sm">
                    {format(new Date(deployment.completedAt), 'MMM d, yyyy HH:mm')}
                  </span>
                </div>
              )}

              {deployment.duration && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Duration</span>
                  <span className="text-sm flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {Math.floor(deployment.duration / 60)}m {deployment.duration % 60}s
                  </span>
                </div>
              )}

              {deployment.steps && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Steps</span>
                  <span className="text-sm">
                    {deployment.steps.filter(s => s.status === 'COMPLETED').length}/{deployment.steps.length}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Error Info */}
          {deployment.status === 'FAILED' && deployment.errorMsg && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Error Details</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-destructive">{deployment.errorMsg}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}