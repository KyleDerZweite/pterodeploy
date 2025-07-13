import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/contexts/auth-context';
import { SocketProvider } from '@/contexts/socket-context';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { LoginPage } from '@/pages/login-page';
import { RegisterPage } from '@/pages/register-page';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { NewDeploymentPage } from '@/pages/new-deployment-page';
import { DeploymentsPage } from '@/pages/deployments-page';
import { DeploymentDetailPage } from '@/pages/deployment-detail-page';
import { TemplatesPage } from '@/pages/templates-page';
import { AdminPage } from '@/pages/admin-page';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="pterodeploy-ui-theme">
      <AuthProvider>
        <SocketProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/new-deployment" replace />} />
                <Route path="new-deployment" element={<NewDeploymentPage />} />
                <Route path="deployments" element={<DeploymentsPage />} />
                <Route path="deployments/:id" element={<DeploymentDetailPage />} />
                <Route path="templates" element={<TemplatesPage />} />
                <Route path="admin" element={<AdminPage />} />
              </Route>
            </Routes>
            <Toaster />
          </Router>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;