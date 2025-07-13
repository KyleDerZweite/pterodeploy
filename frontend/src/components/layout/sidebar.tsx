import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/auth-store';
import {
  Rocket,
  History,
  Package,
  Plus,
  Server,
  Zap,
  Shield,
} from 'lucide-react';

const navigationItems = [
  {
    title: 'New Deployment',
    href: '/new-deployment',
    icon: Plus,
    description: 'Start a new server deployment',
  },
  {
    title: 'Active Deployments',
    href: '/deployments',
    icon: Server,
    description: 'Monitor running deployments',
  },
  {
    title: 'History',
    href: '/deployments?filter=all',
    icon: History,
    description: 'View deployment history',
  },
  {
    title: 'Templates',
    href: '/templates',
    icon: Package,
    description: 'Browse modpack templates',
  },
];

export function Sidebar() {
  const { isAdmin } = useAuthStore();
  
  return (
    <div className="hidden lg:flex h-screen w-64 flex-col border-r bg-card">
      <div className="p-6">
        <div className="flex items-center gap-2">
          <Zap className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-xl font-bold">PteroDeploy</h1>
            <p className="text-xs text-muted-foreground">Minecraft Server Assistant</p>
          </div>
        </div>
      </div>
      
      <Separator />
      
      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-2 py-4">
          {navigationItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                  isActive && 'bg-accent text-accent-foreground'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              <div className="flex-1">
                <div className="font-medium">{item.title}</div>
                <div className="text-xs text-muted-foreground">{item.description}</div>
              </div>
            </NavLink>
          ))}
          
          {isAdmin && (
            <>
              <Separator className="my-2" />
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                    isActive && 'bg-accent text-accent-foreground'
                  )
                }
              >
                <Shield className="h-4 w-4" />
                <div className="flex-1">
                  <div className="font-medium">Admin Dashboard</div>
                  <div className="text-xs text-muted-foreground">Manage users and system</div>
                </div>
              </NavLink>
            </>
          )}
        </nav>
      </ScrollArea>
      
      <div className="p-4 border-t">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Rocket className="h-4 w-4" />
          <span>7/10 deployments used</span>
        </div>
      </div>
    </div>
  );
}