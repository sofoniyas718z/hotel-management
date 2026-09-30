import { useEffect, useMemo, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, Users, DollarSign, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiService } from "@/lib/api";
import type { Booking } from "@/types";

const CustomerDashboard = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map API booking to UI booking
  const mapApiBookingToUi = (booking: any): Booking => {
    const roomInfo = booking.room_number 
      ? `Room ${booking.room_number}`
      : booking.room_name 
      ? booking.room_name 
      : `Room ${booking.room_id || booking.id}`;

    const customerName = [booking.first_name, booking.last_name]
      .filter(Boolean)
      .join(' ') 
      || booking.customer_name 
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

  useEffect(() => {
    let isMounted = true;

    const loadBookings = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        const data = await apiService.getBookings();
        if (!isMounted) return;
        
        // Filter bookings for current user
        const userBookings = data
          .map(mapApiBookingToUi)
          .filter(booking => 
            booking.customerEmail?.toLowerCase() === user.email.toLowerCase() ||
            booking.customerId === user.id.toString()
          );
          
        setBookings(userBookings);
      } catch (err) {
        console.error("Failed to load bookings", err);
        if (isMounted) {
          setError("Unable to load your bookings right now. Please try again later.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadBookings();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const numericId = Number(bookingId);
      if (isNaN(numericId)) {
        throw new Error('Invalid booking ID');
      }
      
      await apiService.updateBookingStatus(numericId, "cancelled");
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId ? { ...booking, status: "cancelled" } : booking
        )
      );
      toast({
        title: "Booking Cancelled",
        description: "Your booking has been cancelled successfully.",
      });
    } catch (err) {
      console.error('Failed to cancel booking:', err);
      toast({
        title: "Cancellation failed",
        description: "We couldn't cancel your booking. Please try again.",
        variant: "destructive",
      });
    }
  };

  const activeBookings = useMemo(
    () => bookings.filter((booking) => 
      booking.status === "confirmed" || booking.status === "pending"
    ),
    [bookings]
  );
  
  const pastBookings = useMemo(
    () => bookings.filter((booking) =>
      ["completed", "checked_out", "cancelled"].includes(booking.status)
    ),
    [bookings]
  );

  // Get status badge class
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'cancelled':
        return 'bg-red-500';
      case 'completed':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl font-bold mb-4">Please Log In</h1>
          <p className="text-muted-foreground">You need to be logged in to view your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, {user.name.split(" ")[0]}
          </h1>
          <p className="text-lg text-muted-foreground">Manage your bookings and account</p>
        </div>

        {loading && (
          <Card className="mb-8 p-6 text-center">
            <p className="text-muted-foreground">Loading your bookings...</p>
          </Card>
        )}

        {error && !loading && (
          <Card className="mb-8 p-6 text-center border-red-200">
            <p className="text-red-600">{error}</p>
            <Button 
              className="mt-4" 
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Try Again
            </Button>
          </Card>
        )}

        {/* Stats Overview */}
        {!loading && !error && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="gradient-card shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Active Bookings</p>
                    <p className="text-3xl font-bold">{activeBookings.length}</p>
                  </div>
                  <div className="w-12 h-12 gradient-primary rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-card shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Past Bookings</p>
                    <p className="text-3xl font-bold">{pastBookings.length}</p>
                  </div>
                  <div className="w-12 h-12 gradient-primary rounded-full flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-primary-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-card shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Spent</p>
                    <p className="text-3xl font-bold">
                      {bookings
                        .filter(b => b.status !== 'cancelled')
                        .reduce((sum, b) => sum + b.totalPrice, 0)
                        .toLocaleString()} ETB
                    </p>
                  </div>
                  <div className="w-12 h-12 gradient-primary rounded-full flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-primary-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bookings Tabs */}
        {!loading && !error && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>My Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="active">
                <TabsList>
                  <TabsTrigger value="active">
                    Active Bookings ({activeBookings.length})
                  </TabsTrigger>
                  <TabsTrigger value="past">
                    Past Bookings ({pastBookings.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-4 mt-6">
                  {activeBookings.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No active bookings. Ready to plan your next stay?</p>
                    </div>
                  ) : (
                    activeBookings.map((booking) => (
                      <Card key={booking.id} className="gradient-card">
                        <CardContent className="pt-6">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="text-xl font-semibold">{booking.roomName}</h3>
                                <Badge className={getStatusClass(booking.status)}>
                                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                </Badge>
                              </div>
                              <div className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  Check-in: {new Date(booking.checkIn).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  Check-out: {new Date(booking.checkOut).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4" />
                                  {booking.guests} Guest{booking.guests > 1 ? "s" : ""}
                                </div>
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-4 h-4" />
                                  Total: {booking.totalPrice.toLocaleString()} ETB
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {booking.status === 'pending' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancelBooking(booking.id)}
                                >
                                  <X className="w-4 h-4" />
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="past" className="space-y-4 mt-6">
                  {pastBookings.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No past bookings yet.</p>
                    </div>
                  ) : (
                    pastBookings.map((booking) => (
                      <Card key={booking.id} className="gradient-card opacity-80">
                        <CardContent className="pt-6">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="text-xl font-semibold">{booking.roomName}</h3>
                                <Badge className={getStatusClass(booking.status)}>
                                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                </Badge>
                              </div>
                              <div className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  Check-in: {new Date(booking.checkIn).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  Check-out: {new Date(booking.checkOut).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4" />
                                  {booking.guests} Guest{booking.guests > 1 ? "s" : ""}
                                </div>
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-4 h-4" />
                                  Total: {booking.totalPrice.toLocaleString()} ETB
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;