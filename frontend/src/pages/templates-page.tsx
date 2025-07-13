import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { useDeploymentStore } from '@/stores/deployment-store';
import { useSocket } from '@/contexts/socket-context';
import { toast } from 'sonner';
import {
  Rocket,
  Search,
  Filter,
  Star,
  Package,
  Loader2,
  ExternalLink,
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  modpackUrl: string;
  category: string;
  featured: boolean;
  createdAt: string;
}

export function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const navigate = useNavigate();
  const { setCurrentDeployment } = useDeploymentStore();
  const { startDeployment } = useSocket();

  useEffect(() => {
    fetchTemplates();
  }, [categoryFilter]);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      
      const response = await api.get(`/templates?${params}`);
      setTemplates(response.data.templates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeployTemplate = async (template: Template) => {
    try {
      // Create deployment
      const response = await api.post('/deployments', {
        modpackUrl: template.modpackUrl,
        modpackName: template.name,
      });

      const deployment = response.data.deployment;
      setCurrentDeployment(deployment);

      // Start deployment
      startDeployment(deployment.id);
      
      toast.success(`Deployment started for ${template.name}`);
      navigate('/new-deployment');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to start deployment');
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = Array.from(new Set(templates.map(t => t.category)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Modpack Templates</h1>
        <p className="text-muted-foreground">
          Choose from popular modpacks and deploy instantly
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-2">
              <Package className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-medium">No templates found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search' : 'No templates available'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {template.name}
                      {template.featured && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      )}
                    </CardTitle>
                    <Badge variant="secondary">{template.category}</Badge>
                  </div>
                </div>
                <CardDescription className="text-sm">
                  {template.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleDeployTemplate(template)}
                  >
                    <Rocket className="h-4 w-4 mr-2" />
                    Deploy
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    asChild
                  >
                    <a href={template.modpackUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}