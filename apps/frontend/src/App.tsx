import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { AuthPage } from './pages/AuthPage';
import { ConversationsPage } from './pages/ConversationsPage';
import { DashboardPage } from './pages/DashboardPage';
import { DeploymentAccountsPage } from './pages/DeploymentAccountsPage';
import { DeploymentCallbackPage } from './pages/DeploymentCallbackPage';
import { EditorPage } from './pages/EditorPage';
import { HomePage } from './pages/HomePage';

function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <div className="min-h-screen bg-black">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/deployments"
                element={
                  <ProtectedRoute>
                    <DeploymentAccountsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/deployment/callback"
                element={
                  <ProtectedRoute>
                    <DeploymentCallbackPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/projects/:projectId/conversations"
                element={
                  <ProtectedRoute>
                    <ConversationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/editor/:conversationId"
                element={
                  <ProtectedRoute>
                    <EditorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/auth/login"
                element={
                  <ProtectedRoute requireAuth={false}>
                    <AuthPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/auth/register"
                element={
                  <ProtectedRoute requireAuth={false}>
                    <AuthPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/auth/password-reset"
                element={
                  <ProtectedRoute requireAuth={false}>
                    <AuthPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </BrowserRouter>
      </ProjectProvider>
    </AuthProvider>
  );
}

export default App;
