import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Search, Edit, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppUser } from '@/types';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [supervisors, setSupervisors] = useState<AppUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<'Admin' | 'Supervisor' | 'Agent'>('Agent');
  const [formSupervisorId, setFormSupervisorId] = useState<string>('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formLevel, setFormLevel] = useState('L1');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchUsers(searchTerm);
      setUsers(data);

      const supervisorsList = data.filter((u: AppUser) => u.role === 'Supervisor');
      setSupervisors(supervisorsList);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchTerm]);

  const openAddDialog = () => {
    setIsEditMode(false);
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: AppUser) => {
    setIsEditMode(true);
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormMobile(user.mobileNumber || '');
    setFormPassword(''); // Password remains empty unless changed
    setFormRole(user.role);
    setFormSupervisorId(typeof user.supervisorId === 'string' ? user.supervisorId : (user.supervisorId as any)?._id || '');
    setFormIsActive(user.isActive);
    setFormLevel(user.level || 'L1');
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormMobile('');
    setFormPassword('');
    setFormRole('Agent');
    setFormSupervisorId('');
    setFormIsActive(true);
    setFormLevel('L1');
  };

  const handleSaveUser = async () => {
    if (!formName || !formEmail || (!isEditMode && !formPassword)) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formName,
        email: formEmail,
        mobileNumber: formMobile,
        role: formRole,
        supervisorId: formSupervisorId === 'none' || !formSupervisorId ? null : formSupervisorId,
        isActive: formIsActive,
        level: formLevel
      };

      if (isEditMode && editingUser) {
        await api.updateUser((editingUser as any)._id || editingUser.id, payload);
        toast.success('User updated successfully');
      } else {
        await api.register({
          ...payload,
          password: formPassword
        });
        toast.success('User registered successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast.error(error.message || 'Failed to save user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await api.deleteUser(userId);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'default';
      case 'supervisor':
        return 'secondary';
      case 'agent':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <DashboardLayout title="User Management">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <CardTitle>Users (Admin Panel)</CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button onClick={openAddDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Supervisor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={(user as any)._id || user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.level || 'L1'}</Badge>
                        </TableCell>
                        <TableCell>
                          {typeof user.supervisorId === 'object' ? (user.supervisorId as any)?.name : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? 'default' : 'secondary'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(user)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteUser((user as any)._id || user.id)}
                              disabled={(user as any)._id === (currentUser as any).id || user.id === currentUser?.id}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
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

      {/* Add/Edit User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit User' : 'Add New User'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update user information and permissions' : 'Create a new user account'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">Name *</Label>
              <Input
                id="user-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Full Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">Email *</Label>
              <Input
                id="user-email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@example.com"
                disabled={isEditMode}
                className={isEditMode ? "bg-muted" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-mobile">Mobile Number</Label>
              <Input
                id="user-mobile"
                value={formMobile}
                onChange={(e) => setFormMobile(e.target.value)}
                placeholder="+1 234 567 8900"
              />
            </div>
            {!isEditMode && (
              <div className="space-y-2">
                <Label htmlFor="user-password">Password *</Label>
                <Input
                  id="user-password"
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="user-role">Role</Label>
              <Select value={formRole} onValueChange={(v: 'Admin' | 'Supervisor' | 'Agent') => setFormRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Supervisor">Supervisor</SelectItem>
                  <SelectItem value="Agent">Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formRole === 'Agent' && (
              <div className="space-y-2">
                <Label htmlFor="user-supervisor">Supervisor</Label>
                <Select value={formSupervisorId} onValueChange={setFormSupervisorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Supervisor</SelectItem>
                    {supervisors.map((sup) => (
                      <SelectItem key={(sup as any)._id || sup.id} value={(sup as any)._id || sup.id}>
                        {sup.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="user-level">Level</Label>
              <Select value={formLevel} onValueChange={setFormLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L1">L1</SelectItem>
                  <SelectItem value="L2">L2</SelectItem>
                  <SelectItem value="L3">L3</SelectItem>
                  <SelectItem value="L4">L4</SelectItem>
                  <SelectItem value="L5">L5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isEditMode && (
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="user-active"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="user-active">Is Active</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                isEditMode ? 'Save Changes' : 'Create User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
