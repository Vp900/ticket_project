export type UserRole = 'Admin' | 'Supervisor' | 'Agent';
export type TicketStatus = 'Open' | 'Closed' | 'Reopened';

export interface AppUser {
  id: string;
  _id?: string;
  name: string;
  email: string;
  mobileNumber: string;
  role: UserRole;
  supervisorId?: string | AppUser | null;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  _id?: string;
  title: string;
  description: string;
  mobileNumber: string;
  status: TicketStatus;
  createdByAgentId: string | AppUser;
  assignedAgentId: string | AppUser;
  supervisorId?: string | AppUser | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalSupervisors: number;
  totalAgents: number;
  openTickets: number;
  closedTickets: number;
  reopenedTickets: number;
}

export interface MonthlyTicketData {
  month: string;
  open: number;
  closed: number;
  reopened: number;
}
