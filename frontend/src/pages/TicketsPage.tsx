import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Edit, RotateCcw, Loader2, Download, Calendar, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { Ticket, TicketStatus, AppUser } from '@/types';
import { format } from 'date-fns';

export default function TicketsPage() {
  const { user: currentUser } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [agents, setAgents] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filter state
  const [titleFilter, setTitleFilter] = useState('');
  const [mobileFilter, setMobileFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formStatus, setFormStatus] = useState<TicketStatus>('Open');
  const [formAssignedAgent, setFormAssignedAgent] = useState('');

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const filters = {
        title: titleFilter,
        mobileNumber: mobileFilter,
        status: statusFilter,
        dateFrom,
        dateTo
      };
      const data = await api.fetchTickets(filters);
      setTickets(data);

      // Also fetch agents for assignment if user is Admin or Supervisor
      if (currentUser?.role === 'Admin' || currentUser?.role === 'Supervisor') {
        const usersData = await api.fetchUsers();
        setAgents(usersData.filter((u: AppUser) => u.role === 'Agent'));
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to fetch tickets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [titleFilter, mobileFilter, statusFilter, dateFrom, dateTo]);

  const openCreateDialog = () => {
    setIsCreateMode(true);
    setEditingTicket(null);
    setFormTitle('');
    setFormDescription('');
    setFormMobile('');
    setFormStatus('Open');
    setFormAssignedAgent('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (ticket: Ticket) => {
    if (currentUser?.role === 'Agent') return; // Agents can't edit details, only reopen/close

    setIsCreateMode(false);
    setEditingTicket(ticket);
    setFormTitle(ticket.title);
    setFormDescription(ticket.description || '');
    setFormMobile(ticket.mobileNumber || '');
    setFormStatus(ticket.status);
    setFormAssignedAgent(typeof ticket.assignedAgentId === 'string' ? ticket.assignedAgentId : (ticket.assignedAgentId as any)?._id || '');
    setIsDialogOpen(true);
  };

  const handleSaveTicket = async () => {
    if (!formTitle.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!formDescription.trim()) {
      toast.error('Description is required');
      return;
    }
    if (!formMobile.trim()) {
      toast.error('Mobile number is required');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: formTitle,
        description: formDescription,
        mobileNumber: formMobile,
        assignedAgentId: formAssignedAgent === 'none' || !formAssignedAgent ? undefined : formAssignedAgent
      };

      if (isCreateMode) {
        await api.createTicket(payload);
        toast.success('Ticket created successfully');
      } else if (editingTicket) {
        await api.editTicket((editingTicket as any)._id || editingTicket.id, payload);

        // Also update status if changed
        if (formStatus !== editingTicket.status) {
          await api.updateTicketStatus((editingTicket as any)._id || editingTicket.id, formStatus);
        }
        toast.success('Ticket updated successfully');
      }

      setIsDialogOpen(false);
      fetchTickets();
    } catch (error: any) {
      console.error('Error saving ticket:', error);
      toast.error(error.message || 'Failed to save ticket');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReopenTicket = async (ticket: Ticket) => {
    try {
      await api.updateTicketStatus((ticket as any)._id || ticket.id, 'Reopened');
      toast.success('Ticket reopened');
      fetchTickets();
    } catch (error) {
      console.error('Error reopening ticket:', error);
      toast.error('Failed to reopen ticket');
    }
  };

  const handleExportToExcel = () => {
    const csvContent = [
      ['ID', 'Title', 'Description', 'Status', 'Mobile', 'Created By', 'Assigned To', 'Assigned Level', 'Created At'].join(','),
      ...tickets.map((t) =>
        [
          (t as any)._id || t.id,
          `"${t.title.replace(/"/g, '""')}"`,
          `"${(t.description || '').replace(/"/g, '""')}"`,
          t.status,
          t.mobileNumber || '',
          (t.createdByAgentId as any)?.name || 'Unknown',
          (t.assignedAgentId as any)?.name || 'Unassigned',
          (t.assignedAgentId as any)?.level || 'N/A',
          format(new Date(t.createdAt), 'yyyy-MM-dd HH:mm'),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tickets_export_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    link.click();
    toast.success('Exported to CSV');
  };

  const getStatusBadgeVariant = (status: TicketStatus) => {
    switch (status.toLowerCase()) {
      case 'open': return 'default';
      case 'closed': return 'secondary';
      case 'reopened': return 'outline';
      default: return 'outline';
    }
  };

  const isAgent = currentUser?.role === 'Agent';

  return (
    <DashboardLayout title="Ticket Manager">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <CardTitle>
            {isAgent ? 'Closed Tickets (Reopen Only)' : 'All Tickets'}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              New Ticket
            </Button>
            <Button variant="outline" onClick={handleExportToExcel}>
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Advanced Search Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search Title..."
                value={titleFilter}
                onChange={(e) => setTitleFilter(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Mobile..."
                value={mobileFilter}
                onChange={(e) => setMobileFilter(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter} disabled={isAgent}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
                <SelectItem value="Reopened">Reopened</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No tickets found
                      </TableCell>
                    </TableRow>
                  ) : (
                    tickets.map((ticket) => (
                      <TableRow key={(ticket as any)._id || ticket.id}>
                        <TableCell className="font-medium max-w-xs truncate">
                          {ticket.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(ticket.status)}>
                            {ticket.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{ticket.mobileNumber || '-'}</TableCell>
                        <TableCell>
                          {(ticket.assignedAgentId as any)?.name || 'Unassigned'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(ticket.createdAt), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {!isAgent && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(ticket)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            {ticket.status === 'Closed' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleReopenTicket(ticket)}
                                title="Reopen Ticket"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Ticket Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isCreateMode ? 'Create Ticket' : 'Edit Ticket'}</DialogTitle>
            <DialogDescription>
              {isCreateMode ? 'Create a new support ticket' : 'Update ticket details'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="t-title">Title *</Label>
              <Input
                id="t-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Issue Title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-desc">Description</Label>
              <Textarea
                id="t-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Details..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-mobile">Mobile Number</Label>
              <Input
                id="t-mobile"
                value={formMobile}
                onChange={(e) => setFormMobile(e.target.value)}
                placeholder="1234567890"
              />
            </div>
            {!isCreateMode && (
              <div className="space-y-2">
                <Label htmlFor="t-status">Status</Label>
                <Select value={formStatus} onValueChange={(v: TicketStatus) => setFormStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                    <SelectItem value="Reopened">Reopened</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {(currentUser?.role === 'Admin' || currentUser?.role === 'Supervisor') && (
              <div className="space-y-2">
                <Label htmlFor="t-agent">Assign To Agent</Label>
                <Select value={formAssignedAgent} onValueChange={setFormAssignedAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Leave Unassigned</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={(agent as any)._id || agent.id} value={(agent as any)._id || agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTicket} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                isCreateMode ? 'Create Ticket' : 'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
