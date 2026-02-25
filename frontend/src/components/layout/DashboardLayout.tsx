import { ReactNode, useState, createContext, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => { },
});

export const useSidebar = () => useContext(SidebarContext);

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  requiredRoles?: string[];
}

export function DashboardLayout({
  children,
  title,
  requiredRoles,
}: DashboardLayoutProps) {
  const { user, isLoading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div className="min-h-screen bg-background flex">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <div
          className={cn(
            "flex-1 min-h-screen transition-all duration-300",
            collapsed ? "ml-16" : "ml-0 lg:ml-64"
          )}
        >
          <Header title={title} />
          <main className="p-4 sm:p-6 animate-fade-in">{children}</main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
