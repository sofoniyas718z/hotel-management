import { useEffect, useMemo, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Users, ClipboardList, AlertTriangle, Plus, CheckCircle2, Loader2, FileText, Bed, UserCheck, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiService, type HousekeepingTask as ApiTask, type HousekeepingStaff as ApiStaff, type Booking, type User } from '@/lib/api';
import type { Room } from '@/types';
import { mapApiRoomToUiRoom } from '@/lib/roomMapper';
import { Input } from '@/components/ui/input';

type CleaningStatus = Room['cleaningStatus'];

// API status mapping
const cleaningStatusToApi: Record<CleaningStatus, string> = {
  clean: 'clean',
  dirty: 'dirty',
  cleaning: 'cleaning_in_progress',
  inspection: 'needs_inspection',
};

const apiStatusToUi: Record<string, CleaningStatus> = {
  clean: 'clean',
  dirty: 'dirty',
  cleaning_in_progress: 'cleaning',
  needs_inspection: 'inspection',
};

// Badge variants
const priorityVariant = (priority: ApiTask['priority']) => {
  switch (priority) {
    case 'high':
    case 'urgent':
      return 'destructive';
    case 'normal':
      return 'default';
    case 'low':
    default:
      return 'secondary';
  }
};

const statusVariant = (status: ApiTask['status']) => {
  switch (status) {
    case 'completed':
      return 'default';
    case 'in_progress':
      return 'secondary';
    case 'pending':
    default:
      return 'outline';
  }
};

const formatStatus = (status: ApiTask['status']) => {
  return status.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

const StaffDashboard = () => {
  const { toast } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [staff, setStaff] = useState<ApiStaff[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [customerViewDialogOpen, setCustomerViewDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  
  const [taskForm, setTaskForm] = useState({
    roomId: '',
    priority: 'normal' as ApiTask['priority'],
    staffId: '',
    notes: '',
  });

  const [roomForm, setRoomForm] = useState({
    roomNumber: '',
    roomType: 'standard' as 'standard' | 'deluxe' | 'suite',
    price: '',
    description: '',
    maxGuests: '2',
  });

  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    phone: '',
    shift: 'morning' as 'morning' | 'afternoon' | 'night' | 'flexible',
  });

  // Statistics
  const dirtyRooms = useMemo(() => rooms.filter((r) => r.cleaningStatus === 'dirty').length, [rooms]);
  const cleaningRooms = useMemo(() => rooms.filter((r) => r.cleaningStatus === 'cleaning').length, [rooms]);
  const onDutyStaff = useMemo(() => staff.filter((s) => s.status === 'active').length, [staff]);
  const pendingTasks = useMemo(() => tasks.filter((t) => t.status === 'pending').length, [tasks]);
  const availableRoomsCount = useMemo(() => rooms.filter((r) => r.available).length, [rooms]);

  // Data loading functions
  const loadRooms = async () => {
    try {
      const apiRooms = await apiService.getRooms();
      const uiRooms = apiRooms.map(mapApiRoomToUiRoom);
      setRooms(uiRooms);
    } catch (error) {
      console.error('Failed to load rooms:', error);
      throw error;
    }
  };

  const loadTasks = async () => {
    try {
      const apiTasks = await apiService.getHousekeepingTasks();
      setTasks(apiTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      throw error;
    }
  };

  const loadStaff = async () => {
    try {
      const apiStaff = await apiService.getHousekeepingStaff();
      setStaff(apiStaff);
    } catch (error) {
      console.error('Failed to load staff:', error);
      throw error;
    }
  };

  const loadBookings = async () => {
    try {
      const apiBookings = await apiService.getBookings();
      setBookings(apiBookings);
    } catch (error) {
      console.error('Failed to load bookings:', error);
      throw error;
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await apiService.getCustomers();
      if (response.data) {
        if (Array.isArray(response.data)) {
          setCustomers(response.data);
        } else if (response.data.users && Array.isArray(response.data.users)) {
          setCustomers(response.data.users);
        } else {
          setCustomers([]);
        }
      } else {
        setCustomers([]);
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
      // Don't throw - just set empty array so other data can load
      setCustomers([]);
    }
  };

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        await Promise.all([loadRooms(), loadTasks(), loadStaff(), loadBookings(), loadCustomers()]);
      } catch (err) {
        console.error('Failed to load admin data:', err);
        setError('Unable to load admin data. Please try again in a moment.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Room status update
  const handleUpdateRoomStatus = async (roomId: string, status: CleaningStatus) => {
    try {
      setUpdatingStatus(roomId);
      const apiStatus = cleaningStatusToApi[status];
      
      // Update via API
      await apiService.updateRoomCleaningStatus(Number(roomId), apiStatus);
      
      // Update local state
      setRooms((prev) =>
        prev.map((room) =>
          room.id === roomId
            ? {
                ...room,
                cleaningStatus: status,
                lastCleanedAt: status === 'clean' ? new Date().toISOString() : room.lastCleanedAt,
              }
            : room
        )
      );
      
      toast({
        title: 'Status Updated',
        description: `Room ${roomId} status has been updated to ${status}.`,
      });
    } catch (err) {
      console.error('Failed to update room status:', err);
      toast({
        title: 'Update Failed',
        description: 'Unable to update room status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Task status update
  const handleUpdateTaskStatus = async (taskId: number, status: ApiTask['status']) => {
    try {
      await apiService.updateHousekeepingTaskStatus(taskId, status);
      
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? { ...task, status } : task))
      );
      
      toast({
        title: 'Task Updated',
        description: `Task has been marked as ${formatStatus(status)}.`,
      });
    } catch (err) {
      console.error('Failed to update task status:', err);
      toast({
        title: 'Update Failed',
        description: 'Unable to update task status. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Create new task
  const handleCreateTask = async () => {
    if (!taskForm.roomId) {
      toast({
        title: 'Room Required',
        description: 'Please select a room before creating the task.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreatingTask(true);
      
      await apiService.createHousekeepingTask({
        room_id: Number(taskForm.roomId),
        staff_id: taskForm.staffId ? Number(taskForm.staffId) : undefined,
        task_type: 'cleaning',
        priority: taskForm.priority,
        notes: taskForm.notes || undefined,
      });

      // Reload tasks to get the updated list
      await loadTasks();
      
      // Reset form and close dialog
      setTaskDialogOpen(false);
      setTaskForm({
        roomId: '',
        priority: 'normal',
        staffId: '',
        notes: '',
      });

      toast({
        title: 'Task Created',
        description: 'New housekeeping task has been created successfully.',
      });
    } catch (err) {
      console.error('Failed to create task:', err);
      toast({
        title: 'Creation Failed',
        description: 'Unable to create task. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCreatingTask(false);
    }
  };

  // Available rooms for task creation (only dirty rooms)
  const availableRooms = useMemo(() => 
    rooms.filter(room => room.cleaningStatus === 'dirty' || room.cleaningStatus === 'inspection'),
    [rooms]
  );

  // Active staff members
  const activeStaff = useMemo(() => 
    staff.filter(member => member.status === 'active'),
    [staff]
  );

  // Create new room
  const handleCreateRoom = async () => {
    if (!roomForm.roomNumber || !roomForm.price) {
      toast({
        title: 'Required Fields',
        description: 'Please fill in room number and price.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreatingRoom(true);
      
      const roomTypeMap: Record<string, string> = {
        'standard': 'single',
        'deluxe': 'double',
        'suite': 'suite',
      };

      await apiService.createRoom({
        room_number: roomForm.roomNumber,
        room_type: roomTypeMap[roomForm.roomType] || 'single',
        price_per_night: parseFloat(roomForm.price),
        description: roomForm.description || undefined,
        max_guests: parseInt(roomForm.maxGuests) || 2,
      });

      await loadRooms();
      
      setRoomDialogOpen(false);
      setRoomForm({
        roomNumber: '',
        roomType: 'standard',
        price: '',
        description: '',
        maxGuests: '2',
      });

      toast({
        title: 'Room Created',
        description: 'New room has been created successfully.',
      });
    } catch (err) {
      console.error('Failed to create room:', err);
      toast({
        title: 'Creation Failed',
        description: 'Unable to create room. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCreatingRoom(false);
    }
  };

  // Create new staff member
  const handleCreateStaff = async () => {
    if (!staffForm.name || !staffForm.email) {
      toast({
        title: 'Required Fields',
        description: 'Please fill in name and email.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreatingStaff(true);
      
      await apiService.createHousekeepingStaff({
        name: staffForm.name,
        email: staffForm.email,
        phone: staffForm.phone || '',
        shift: staffForm.shift,
      });

      await loadStaff();
      
      setStaffDialogOpen(false);
      setStaffForm({
        name: '',
        email: '',
        phone: '',
        shift: 'morning',
      });

      toast({
        title: 'Staff Member Created',
        description: 'New staff member has been added successfully.',
      });
    } catch (err) {
      console.error('Failed to create staff:', err);
      toast({
        title: 'Creation Failed',
        description: 'Unable to create staff member. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCreatingStaff(false);
    }
  };

  // View customer identity
  const handleViewCustomer = (customer: User) => {
    setSelectedCustomer(customer);
    setCustomerViewDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation userRole="admin" />
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading housekeeping data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="admin" />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-lg text-muted-foreground">Manage cleaning tasks, room status, customers, and staff</p>
        </div>

        {error && (
          <Card className="mb-8 p-6 text-center border-destructive/40 bg-destructive/10">
            <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-4" />
            <p className="text-destructive font-medium mb-4">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
            >
              Retry Loading
            </Button>
          </Card>
        )}

        {!error && (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Dirty Rooms</p>
                      <p className="text-2xl font-bold text-destructive">{dirtyRooms}</p>
                    </div>
                    <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Cleaning in Progress</p>
                      <p className="text-2xl font-bold text-amber-600">{cleaningRooms}</p>
                    </div>
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Staff On Duty</p>
                      <p className="text-2xl font-bold text-blue-600">{onDutyStaff}</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Pending Tasks</p>
                      <p className="text-2xl font-bold text-purple-600">{pendingTasks}</p>
                    </div>
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <ClipboardList className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Admin Management</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="tasks" className="w-full">
                  <TabsList className="grid w-full grid-cols-6 p-2">
                    <TabsTrigger value="tasks">Tasks</TabsTrigger>
                    <TabsTrigger value="rooms">Room Status</TabsTrigger>
                    <TabsTrigger value="room-management">Rooms</TabsTrigger>
                    <TabsTrigger value="customers">Customers</TabsTrigger>
                    <TabsTrigger value="staff">Staff</TabsTrigger>
                    <TabsTrigger value="staff-management">Add Staff</TabsTrigger>
                  </TabsList>

                  {/* Tasks Tab */}
                  <TabsContent value="tasks" className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Housekeeping Tasks</h3>
                      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="default" size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Create Task
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create Housekeeping Task</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="room">Room *</Label>
                              <Select
                                value={taskForm.roomId}
                                onValueChange={(value) => setTaskForm(prev => ({ ...prev, roomId: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select room" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableRooms.map((room) => (
                                    <SelectItem key={room.id} value={room.id}>
                                      {room.name} - {room.type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="priority">Priority</Label>
                              <Select
                                value={taskForm.priority}
                                onValueChange={(value: ApiTask['priority']) => 
                                  setTaskForm(prev => ({ ...prev, priority: value }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="normal">Normal</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="staff">Assign to Staff (Optional)</Label>
                              <Select
                                value={taskForm.staffId}
                                onValueChange={(value) => setTaskForm(prev => ({ ...prev, staffId: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select staff member" />
                                </SelectTrigger>
                                <SelectContent>
                                  {activeStaff.map((member) => (
                                    <SelectItem key={member.id} value={String(member.id)}>
                                      {member.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="notes">Notes</Label>
                              <Textarea
                                id="notes"
                                placeholder="Special instructions or notes..."
                                value={taskForm.notes}
                                onChange={(e) => setTaskForm(prev => ({ ...prev, notes: e.target.value }))}
                                rows={3}
                              />
                            </div>

                            <Button
                              onClick={handleCreateTask}
                              disabled={creatingTask || !taskForm.roomId}
                              className="w-full"
                            >
                              {creatingTask ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                'Create Task'
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Task ID</TableHead>
                            <TableHead>Room</TableHead>
                            <TableHead>Assigned To</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tasks.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                No tasks found
                              </TableCell>
                            </TableRow>
                          ) : (
                            tasks.map((task) => (
                              <TableRow key={task.id}>
                                <TableCell className="font-medium">#{task.id}</TableCell>
                                <TableCell>
                                  {task.room_number ? `Room ${task.room_number}` : `Room ${task.room_id}`}
                                </TableCell>
                                <TableCell>{task.staff_name || 'Unassigned'}</TableCell>
                                <TableCell>
                                  <Badge variant={priorityVariant(task.priority)}>
                                    {task.priority}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={statusVariant(task.status)}>
                                    {formatStatus(task.status)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-[200px]">
                                  <div className="truncate" title={task.notes || ''}>
                                    {task.notes || '—'}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    {task.status === 'pending' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}
                                      >
                                        Start
                                      </Button>
                                    )}
                                    {task.status === 'in_progress' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                                      >
                                        <CheckCircle2 className="w-4 h-4 mr-1" />
                                        Complete
                                      </Button>
                                    )}
                                    {task.status === 'completed' && (
                                      <Badge variant="default">Done</Badge>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  {/* Rooms Tab */}
                  <TabsContent value="rooms" className="p-6">
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Room ID</TableHead>
                            <TableHead>Room Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last Cleaned</TableHead>
                            <TableHead>Update Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rooms.map((room) => (
                            <TableRow key={room.id}>
                              <TableCell className="font-medium">#{room.id}</TableCell>
                              <TableCell>{room.name}</TableCell>
                              <TableCell className="capitalize">{room.type}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    room.cleaningStatus === 'clean' ? 'default' :
                                    room.cleaningStatus === 'dirty' ? 'destructive' : 'secondary'
                                  }
                                >
                                  {room.cleaningStatus}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {room.lastCleanedAt ? (
                                  new Date(room.lastCleanedAt).toLocaleDateString()
                                ) : (
                                  'Never'
                                )}
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={room.cleaningStatus}
                                  onValueChange={(value: CleaningStatus) => 
                                    handleUpdateRoomStatus(room.id, value)
                                  }
                                  disabled={updatingStatus === room.id}
                                >
                                  <SelectTrigger className="w-32">
                                    {updatingStatus === room.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <SelectValue />
                                    )}
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="clean">Clean</SelectItem>
                                    <SelectItem value="dirty">Dirty</SelectItem>
                                    <SelectItem value="cleaning">Cleaning</SelectItem>
                                    <SelectItem value="inspection">Inspection</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  {/* Staff Tab */}
                  <TabsContent value="staff" className="p-6">
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Staff ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Shift</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {staff.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell className="font-medium">#{member.id}</TableCell>
                              <TableCell>{member.name}</TableCell>
                              <TableCell>{member.email}</TableCell>
                              <TableCell>{member.phone || '—'}</TableCell>
                              <TableCell className="capitalize">{member.shift}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={member.status === 'active' ? 'default' : 'secondary'}
                                >
                                  {member.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  {/* Room Management Tab */}
                  <TabsContent value="room-management" className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Room Management</h3>
                      <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="default" size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Room
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create New Room</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="roomNumber">Room Number *</Label>
                              <Input
                                id="roomNumber"
                                value={roomForm.roomNumber}
                                onChange={(e) => setRoomForm(prev => ({ ...prev, roomNumber: e.target.value }))}
                                placeholder="e.g., 101"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="roomType">Room Type *</Label>
                              <Select
                                value={roomForm.roomType}
                                onValueChange={(value: 'standard' | 'deluxe' | 'suite') => 
                                  setRoomForm(prev => ({ ...prev, roomType: value }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="standard">Standard</SelectItem>
                                  <SelectItem value="deluxe">Deluxe</SelectItem>
                                  <SelectItem value="suite">Suite</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="price">Price per Night (ETB) *</Label>
                              <Input
                                id="price"
                                type="number"
                                value={roomForm.price}
                                onChange={(e) => setRoomForm(prev => ({ ...prev, price: e.target.value }))}
                                placeholder="e.g., 1500"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="maxGuests">Max Guests</Label>
                              <Input
                                id="maxGuests"
                                type="number"
                                min="1"
                                max="10"
                                value={roomForm.maxGuests}
                                onChange={(e) => setRoomForm(prev => ({ ...prev, maxGuests: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="description">Description</Label>
                              <Textarea
                                id="description"
                                value={roomForm.description}
                                onChange={(e) => setRoomForm(prev => ({ ...prev, description: e.target.value }))}
                                rows={3}
                                placeholder="Room description..."
                              />
                            </div>
                            <Button
                              onClick={handleCreateRoom}
                              disabled={creatingRoom || !roomForm.roomNumber || !roomForm.price}
                              className="w-full"
                            >
                              {creatingRoom ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                'Create Room'
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Available Rooms</p>
                              <p className="text-2xl font-bold text-green-600">{availableRoomsCount}</p>
                            </div>
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Booked Rooms</p>
                              <p className="text-2xl font-bold text-amber-600">{rooms.length - availableRoomsCount}</p>
                            </div>
                            <Users className="w-8 h-8 text-amber-600" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Room Number</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Price/Night</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Available</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rooms.map((room) => (
                            <TableRow key={room.id}>
                              <TableCell className="font-medium">{room.name}</TableCell>
                              <TableCell className="capitalize">{room.type}</TableCell>
                              <TableCell>{room.price.toLocaleString()} ETB</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    room.cleaningStatus === 'clean' ? 'default' :
                                    room.cleaningStatus === 'dirty' ? 'destructive' : 'secondary'
                                  }
                                >
                                  {room.cleaningStatus}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={room.available ? 'default' : 'secondary'}>
                                  {room.available ? 'Available' : 'Booked'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  {/* Customers Tab */}
                  <TabsContent value="customers" className="p-6">
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Identity</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                No customers found
                              </TableCell>
                            </TableRow>
                          ) : (
                            customers.map((customer) => (
                              <TableRow key={customer.id}>
                                <TableCell className="font-medium">#{customer.id}</TableCell>
                                <TableCell>{customer.first_name} {customer.last_name}</TableCell>
                                <TableCell>{customer.email}</TableCell>
                                <TableCell>{customer.phone || '—'}</TableCell>
                                <TableCell>
                                  {customer.id_document || customer.passport_document ? (
                                    <Badge variant="default">
                                      {customer.id_document_type === 'id_card' ? 'ID Card' : 
                                       customer.id_document_type === 'passport' ? 'Passport' : 
                                       customer.id_document_type === 'both' ? 'Both' : 'Document'}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewCustomer(customer)}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  {/* Staff Management Tab */}
                  <TabsContent value="staff-management" className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Add New Staff Member</h3>
                    </div>
                    <Card>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="staffName">Full Name *</Label>
                            <Input
                              id="staffName"
                              value={staffForm.name}
                              onChange={(e) => setStaffForm(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="John Doe"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="staffEmail">Email *</Label>
                            <Input
                              id="staffEmail"
                              type="email"
                              value={staffForm.email}
                              onChange={(e) => setStaffForm(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="john@example.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="staffPhone">Phone</Label>
                            <Input
                              id="staffPhone"
                              type="tel"
                              value={staffForm.phone}
                              onChange={(e) => setStaffForm(prev => ({ ...prev, phone: e.target.value }))}
                              placeholder="+251 91 234 5678"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="staffShift">Shift</Label>
                            <Select
                              value={staffForm.shift}
                              onValueChange={(value: 'morning' | 'afternoon' | 'night' | 'flexible') => 
                                setStaffForm(prev => ({ ...prev, shift: value }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="morning">Morning</SelectItem>
                                <SelectItem value="afternoon">Afternoon</SelectItem>
                                <SelectItem value="night">Night</SelectItem>
                                <SelectItem value="flexible">Flexible</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            onClick={handleCreateStaff}
                            disabled={creatingStaff || !staffForm.name || !staffForm.email}
                            className="w-full"
                          >
                            {creatingStaff ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Staff Member
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Customer Identity View Dialog */}
      <Dialog open={customerViewDialogOpen} onOpenChange={setCustomerViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Identity Information</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <p className="font-medium">{selectedCustomer.first_name} {selectedCustomer.last_name}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="font-medium">{selectedCustomer.email}</p>
                </div>
                <div>
                  <Label>Phone</Label>
                  <p className="font-medium">{selectedCustomer.phone || '—'}</p>
                </div>
                <div>
                  <Label>Document Type</Label>
                  <p className="font-medium">
                    {selectedCustomer.id_document_type === 'id_card' ? 'ID Card' : 
                     selectedCustomer.id_document_type === 'passport' ? 'Passport' : 
                     selectedCustomer.id_document_type === 'both' ? 'Both' : '—'}
                  </p>
                </div>
              </div>
              
              {(selectedCustomer.id_document || selectedCustomer.passport_document) && (
                <div className="space-y-2">
                  <Label>Identity Documents</Label>
                  <div className="space-y-2">
                    {selectedCustomer.id_document && (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            <span className="font-medium">ID Card</span>
                          </div>
                          <a 
                            href={selectedCustomer.id_document} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </a>
                        </div>
                      </div>
                    )}
                    {selectedCustomer.passport_document && (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            <span className="font-medium">Passport</span>
                          </div>
                          <a 
                            href={selectedCustomer.passport_document} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {!selectedCustomer.id_document && !selectedCustomer.passport_document && (
                <div className="text-center py-8 text-muted-foreground">
                  No identity documents uploaded
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffDashboard;