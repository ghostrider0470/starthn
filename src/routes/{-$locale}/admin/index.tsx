import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useAdminStats } from '@/hooks/useBlogQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  FileText,
  Settings,
  Shield,
  Activity,
  Database,
  CheckCircle,
  PenSquare,
} from 'lucide-react';

export const Route = createFileRoute('/{-$locale}/admin/')({
  component: AdminPanelPage,
});

function AdminPanelPage() {
  const currentLocale = getLocaleFromPath(window.location.pathname);
  const { data: stats } = useAdminStats();
  const navigate = useNavigate();
  const { toast } = useToast();

  const comingSoon = (feature: string) => {
    toast({
      title: 'Coming Soon',
      description: `${feature} will be available in a future update.`,
    });
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          System overview and quick actions
        </p>
      </div>

      <div>
        {/* System Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers ?? '—'}</div>
              <p className="text-xs text-muted-foreground">
                Registered accounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Services</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">6</div>
              <p className="text-xs text-muted-foreground">
                All services operational
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Blog Posts</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.publishedPosts ?? '—'}</div>
              <p className="text-xs text-muted-foreground">
                Published articles{stats?.totalPosts != null && stats.totalPosts > (stats.publishedPosts ?? 0)
                  ? ` (${stats.totalPosts - (stats.publishedPosts ?? 0)} drafts)`
                  : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">99.9%</div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Management Sections */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Blog Management */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenSquare className="h-5 w-5" />
                Blog Management
              </CardTitle>
              <CardDescription>
                Create, edit, and publish blog posts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Total Posts</span>
                <Badge>{stats?.totalPosts ?? '—'}</Badge>
              </div>
              <Button asChild className="w-full">
                <Link to={withLocalePath('/admin/blog', currentLocale)}>
                  <PenSquare className="mr-2 h-4 w-4" />
                  Manage Blog
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* User Management */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage all system users and roles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Total Users</span>
                <Badge>{stats?.totalUsers ?? '—'} Active</Badge>
              </div>
              <Button className="w-full" variant="outline" onClick={() => comingSoon('User management')}>
                <Users className="mr-2 h-4 w-4" />
                View All Users
              </Button>
              <Button className="w-full" variant="outline" onClick={() => comingSoon('Role management')}>
                <Shield className="mr-2 h-4 w-4" />
                Manage Roles
              </Button>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Settings
              </CardTitle>
              <CardDescription>
                Configure system-wide settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" variant="outline" onClick={() => comingSoon('General settings')}>
                <Settings className="mr-2 h-4 w-4" />
                General Settings
              </Button>
              <Button className="w-full" variant="outline" onClick={() => comingSoon('Security settings')}>
                <Shield className="mr-2 h-4 w-4" />
                Security Settings
              </Button>
            </CardContent>
          </Card>

          {/* Database Management */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database
              </CardTitle>
              <CardDescription>
                Database operations and maintenance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" variant="outline" onClick={() => comingSoon('Database backup')}>
                <Database className="mr-2 h-4 w-4" />
                Backup Database
              </Button>
              <Button className="w-full" variant="outline" onClick={() => comingSoon('System logs')}>
                <Activity className="mr-2 h-4 w-4" />
                View Logs
              </Button>
            </CardContent>
          </Card>

          {/* System Health */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Health
              </CardTitle>
              <CardDescription>
                Monitor system status and performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm">API Status</span>
                  <Badge variant="success">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Online
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm">Database</span>
                  <Badge variant="success">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Connected
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm">Storage</span>
                  <Badge variant="success">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Available
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recent System Activity</CardTitle>
            <CardDescription>Latest actions across the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="h-2 w-2 bg-primary rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">New user registered</p>
                  <p className="text-xs text-muted-foreground">user5@example.com joined as Individual</p>
                </div>
                <span className="text-xs text-muted-foreground">2 hours ago</span>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="h-2 w-2 bg-accent rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Blog post published</p>
                  <p className="text-xs text-muted-foreground">New article on cloud migration strategies</p>
                </div>
                <span className="text-xs text-muted-foreground">5 hours ago</span>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="h-2 w-2 bg-muted-foreground rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">System settings updated</p>
                  <p className="text-xs text-muted-foreground">Email notification templates refreshed</p>
                </div>
                <span className="text-xs text-muted-foreground">1 day ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

