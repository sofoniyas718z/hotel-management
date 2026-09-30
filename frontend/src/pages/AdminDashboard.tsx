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
import { Bed, Users, Edit, Trash2, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';
import type { Booking, Room } from '@/types';
import { mapApiRoomToUiRoom } from '@/lib/roomMapper';

const AdminDashboard = () => {
  const { toast } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);

  const totalRooms = rooms.length;
  const availableRooms = rooms.filter((r) => r.available).length;
  const bookedRooms = rooms.filter((r) => !r.available).length;

  const customers = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; email: string; totalBookings: number; lastBooking: string }
    >();

    bookings.forEach((booking) => {
      const key = booking.customerEmail || booking.customerId || booking.id;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: booking.customerName,
          email: booking.customerEmail,
          totalBookings: 0,
          lastBooking: booking.createdAt,
        });
      }
      const entry = map.get(key)!;
      entry.totalBookings += 1;
      if (new Date(booking.createdAt) > new Date(entry.lastBooking)) {
        entry.lastBooking = booking.createdAt;
      }
    });

    return Array.from(map.values());
  }, [bookings]);

  // Map API booking to UI booking
  const mapApiBookingToUi = (booking: any): Booking => {
    // Handle different API response structures
    const roomInfo = booking.room_number 
      ? `Room ${booking.room_number}`
      : booking.room_name 
      ? booking.room_name 
      : `Room ${booking.room_id || booking.id}`;

    const customerName = [booking.first_name, booking.last_name]
      .filter(Boolean)
      .join(' ') 
      || booking.customer_name 
      || booking.customerName 
      || 'Guest';

    return {
      id: String(booking.id || booking.booking_id),
      roomId: String(booking.room_id || ''),
      roomName: roomInfo,
      customerId: String(booking.customer_id || booking.user_id || ''),
      customerName: customerName,
      customerEmail: booking.email || booking.customer_email || '',
      checkIn: booking.check_in || booking.checkIn,
      checkOut: booking.check_out || booking.checkOut,
      guests: booking.total_guests || booking.guests || 1,
      totalPrice: Number(booking.total_amount || booking.totalPrice || 0),
      status: booking.status || 'pending',
      createdAt: booking.created_at || booking.createdAt || new Date().toISOString(),
    };
  };

  const loadRooms = async () => {
    try {
      const apiRooms = await apiService.getRooms();
      setRooms(apiRooms.map(mapApiRoomToUiRoom));
    } catch (err) {
      console.error('Failed to load rooms:', err);
      throw new Error('Unable to load rooms');
    }
  };

  const loadBookings = async () => {
    try {
      const apiBookings = await apiService.getBookings();
      setBookings(apiBookings.map(mapApiBookingToUi));
    } catch (err) {
      console.error('Failed to load bookings:', err);
      throw new Error('Unable to load bookings');
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        await Promise.all([loadRooms(), loadBookings()]);
      } catch (err) {
        console.error('Failed to load admin data', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unable to load dashboard data. Please try again later.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleBookingStatus = async (bookingId: string, status: Booking['status']) => {
    try {
      setUpdatingBookingId(bookingId);
      // Ensure we're passing a number for the booking ID
      const numericId = Number(bookingId);
      if (isNaN(numericId)) {
        throw new Error('Invalid booking ID');
      }
      
      await apiService.updateBookingStatus(numericId, status);
      
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId ? { ...booking, status } : booking
        )
      );
      
      const statusMessages: Record<string, string> = {
        'pending': 'pending',
        'confirmed': 'confirmed',
        'checked_in': 'checked in',
        'checked_out': 'checked out',
        'cancelled': 'cancelled'
      };
      
      toast({
        title: 'Booking Updated',
        description: `Booking has been ${statusMessages[status] || status}.`,
      });
    } catch (err) {
      console.error('Failed to update booking status', err);
    toast({
        title: 'Update failed',
        description: 'Unable to update booking status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingBookingId(null);
    }
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Get status badge class
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="reception" />

      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Reception Dashboard</h1>
          <p className="text-lg text-muted-foreground">Manage your hotel operations</p>
        </div>

        {loading && (
          <Card className="mb-8 p-6 text-center">
            <p className="text-muted-foreground">Loading dashboard data...</p>
          </Card>
        )}

        {error && !loading && (
          <Card className="mb-8 p-6 text-center border-destructive/40">
            <p className="text-destructive">{error}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </Card>
        )}

        {!loading && !error && (
          <>
            {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="gradient-card shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Rooms</p>
                  <p className="text-3xl font-bold">{totalRooms}</p>
                </div>
                <div className="w-12 h-12 gradient-primary rounded-full flex items-center justify-center">
                  <Bed className="w-6 h-6 text-primary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Available</p>
                      <p className="text-3xl font-bold text-green-600">{availableRooms}</p>
                </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Booked</p>
                      <p className="text-3xl font-bold text-amber-600">{bookedRooms}</p>
                </div>
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Management Tabs */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="bookings">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="bookings">Bookings</TabsTrigger>
                <TabsTrigger value="rooms">Rooms</TabsTrigger>
                <TabsTrigger value="customers">Customers</TabsTrigger>
              </TabsList>

              <TabsContent value="bookings" className="mt-6">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Room</TableHead>
                        <TableHead>Check-in</TableHead>
                        <TableHead>Check-out</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                          {bookings.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                No bookings found
                              </TableCell>
                            </TableRow>
                          ) : (
                            bookings.map((booking) => (
                        <TableRow key={booking.id}>
                                <TableCell className="font-medium">#{booking.id}</TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{booking.customerName}</div>
                                    <div className="text-sm text-muted-foreground">{booking.customerEmail}</div>
                                  </div>
                                </TableCell>
                          <TableCell>{booking.roomName}</TableCell>
                                <TableCell>
                                  {booking.checkIn ? new Date(booking.checkIn).toLocaleDateString() : 'N/A'}
                                </TableCell>
                                <TableCell>
                                  {booking.checkOut ? new Date(booking.checkOut).toLocaleDateString() : 'N/A'}
                                </TableCell>
                                <TableCell>{booking.totalPrice.toLocaleString()} ETB</TableCell>
                          <TableCell>
                            <Badge
                                    variant={getStatusVariant(booking.status)}
                                    className={getStatusClass(booking.status)}
                            >
                                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {booking.status === 'pending' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                        disabled={updatingBookingId === booking.id}
                                        onClick={() => handleBookingStatus(booking.id, 'confirmed')}
                                        title="Confirm Booking"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              )}
                                    {booking.status === 'confirmed' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={updatingBookingId === booking.id}
                                        onClick={() => handleBookingStatus(booking.id, 'checked_in')}
                                        title="Check In"
                                      >
                                        Check In
                                      </Button>
                                    )}
                                    {booking.status === 'checked_in' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={updatingBookingId === booking.id}
                                        onClick={() => handleBookingStatus(booking.id, 'checked_out')}
                                        title="Check Out"
                                      >
                                        Check Out
                                      </Button>
                                    )}
                                    {booking.status !== 'cancelled' && booking.status !== 'checked_out' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                        disabled={updatingBookingId === booking.id}
                                        onClick={() => handleBookingStatus(booking.id, 'cancelled')}
                                        title="Cancel Booking"
                                >
                                  <X className="w-4 h-4" />
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
              </TabsContent>

              <TabsContent value="rooms" className="mt-6">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                          {rooms.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                No rooms found
                              </TableCell>
                            </TableRow>
                          ) : (
                            rooms.map((room) => (
                        <TableRow key={room.id}>
                                <TableCell className="font-medium">#{room.id}</TableCell>
                          <TableCell>{room.name}</TableCell>
                          <TableCell className="capitalize">{room.type}</TableCell>
                                <TableCell>{room.price.toLocaleString()} ETB</TableCell>
                          <TableCell>
                                  <Badge
                                    variant={room.available ? 'default' : 'secondary'}
                                    className={room.available ? 'bg-green-500' : 'bg-amber-500'}
                                  >
                              {room.available ? 'Available' : 'Booked'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                                    <Button variant="outline" size="sm" disabled>
                                <Edit className="w-4 h-4" />
                              </Button>
                                    <Button variant="outline" size="sm" disabled>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                            ))
                          )}
                    </TableBody>
                  </Table>
                </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      Room management actions will be available soon.
                    </p>
              </TabsContent>

              <TabsContent value="customers" className="mt-6">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Total Bookings</TableHead>
                            <TableHead>Last Booking</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                          {customers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                No customers found
                              </TableCell>
                            </TableRow>
                          ) : (
                            customers.map((customer) => (
                        <TableRow key={customer.id}>
                                <TableCell className="font-medium">{customer.name}</TableCell>
                                <TableCell>{customer.email || 'N/A'}</TableCell>
                                <TableCell>{customer.totalBookings}</TableCell>
                                <TableCell>
                                  {customer.lastBooking
                                    ? new Date(customer.lastBooking).toLocaleDateString()
                                    : 'N/A'}
                                </TableCell>
                        </TableRow>
                            ))
                          )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;