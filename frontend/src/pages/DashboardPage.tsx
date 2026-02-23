import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { TicketChart } from '@/components/dashboard/TicketChart';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Users, UserCheck, Ticket, TicketCheck, RotateCcw, Activity } from 'lucide-react';
import { MonthlyTicketData } from '@/types';

interface Stats {
  totalSupervisors: number;
  totalAgents: number;
  levelWiseAgents: {
    active: number;
    inactive: number;
  };
  tickets: {
    open: number;
    closed: number;
    reopened: number;
  };
  chartData: MonthlyTicketData[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalSupervisors: 0,
    totalAgents: 0,
    levelWiseAgents: { active: 0, inactive: 0 },
    tickets: { open: 0, closed: 0, reopened: 0 },
    chartData: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const data = await api.fetchStats();
        setStats(data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const getDashboardTitle = () => {
    switch (user?.role?.toLowerCase()) {
      case 'admin':
        return 'Admin Dashboard';
      case 'supervisor':
        return 'Supervisor Dashboard';
      case 'agent':
        return 'Agent Dashboard';
      default:
        return 'Dashboard';
    }
  };

  return (
    <DashboardLayout title={getDashboardTitle()}>
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {user?.role === 'Admin' && (
            <StatCard
              title="Total Supervisors"
              value={stats.totalSupervisors}
              icon={UserCheck}
              variant="primary"
            />
          )}

          {(user?.role === 'Admin' || user?.role === 'Supervisor') && (
            <StatCard
              title={user?.role === 'Admin' ? "Total Agents" : "My Agents"}
              value={stats.totalAgents}
              icon={Users}
              variant="info"
              subtitle={`Active: ${stats.levelWiseAgents.active} | Inactive: ${stats.levelWiseAgents.inactive}`}
            />
          )}

          <StatCard
            title="Open Tickets"
            value={stats.tickets.open}
            icon={Ticket}
            variant="warning"
          />
          <StatCard
            title="Closed Tickets"
            value={stats.tickets.closed}
            icon={TicketCheck}
            variant="success"
          />
          <StatCard
            title="Reopened Tickets"
            value={stats.tickets.reopened}
            icon={RotateCcw}
            variant="default"
          />

          {user?.role === 'Agent' && (
            <StatCard
              title="Activity Rate"
              value={`${Math.round((stats.tickets.closed / (stats.tickets.open + stats.tickets.closed || 1)) * 100)}%`}
              icon={Activity}
              variant="info"
            />
          )}
        </div>

        {/* Chart */}
        <TicketChart data={stats.chartData} />
      </div>
    </DashboardLayout>
  );
}
