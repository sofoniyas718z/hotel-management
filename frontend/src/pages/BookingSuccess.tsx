import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { apiService } from '@/lib/api';

const BookingSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'success' | 'failed' | 'pending'>('pending');
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const txRef = searchParams.get('tx_ref');
  const statusParam = searchParams.get('status');

  useEffect(() => {
    if (!txRef) {
      setError('Missing transaction reference');
      setLoading(false);
      return;
    }

    const checkPaymentStatus = async () => {
      try {
        if (statusParam === 'success') {
          const bookingIdParam = searchParams.get('booking_id');
          setBookingId(bookingIdParam);
          setStatus('success');
        } else if (statusParam === 'failed') {
          setStatus('failed');
        } else {
          // Check payment status from API
          try {
            const response = await apiService.getPaymentStatus(txRef);
            if (response.data?.status === 'completed') {
              setStatus('success');
              setBookingId(response.data.booking_id?.toString() || null);
            } else {
              setStatus('failed');
            }
          } catch (err) {
            setStatus('failed');
            setError('Could not verify payment status');
          }
        }
      } catch (err) {
        console.error('Failed to check payment status', err);
        setError('An error occurred while checking payment status');
      } finally {
        setLoading(false);
      }
    };

    checkPaymentStatus();
  }, [txRef, statusParam, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-2xl mx-auto shadow-card">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <h2 className="text-2xl font-semibold mb-2">Processing Payment...</h2>
                <p className="text-muted-foreground">Please wait while we verify your payment.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto shadow-card">
          <CardContent className="pt-6">
            {status === 'success' ? (
              <div className="flex flex-col items-center text-center py-8">
                <CheckCircle className="w-20 h-20 text-success mb-4" />
                <CardTitle className="text-3xl mb-2">Booking Confirmed!</CardTitle>
                <p className="text-muted-foreground mb-6">
                  Your payment has been processed successfully and your booking is confirmed.
                </p>
                {bookingId && (
                  <div className="bg-muted rounded-lg p-4 mb-6 w-full">
                    <p className="text-sm text-muted-foreground mb-1">Booking ID</p>
                    <p className="text-2xl font-bold">{bookingId}</p>
                  </div>
                )}
                {txRef && (
                  <div className="bg-muted rounded-lg p-4 mb-6 w-full">
                    <p className="text-sm text-muted-foreground mb-1">Transaction Reference</p>
                    <p className="text-lg font-mono">{txRef}</p>
                  </div>
                )}
                <div className="flex gap-4 w-full">
                  <Link to="/customer-dashboard" className="flex-1">
                    <Button variant="hero" className="w-full">
                      View My Bookings
                    </Button>
                  </Link>
                  <Link to="/rooms" className="flex-1">
                    <Button variant="outline" className="w-full">
                      Book Another Room
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center py-8">
                <XCircle className="w-20 h-20 text-destructive mb-4" />
                <CardTitle className="text-3xl mb-2">Payment Failed</CardTitle>
                <p className="text-muted-foreground mb-6">
                  {error || 'Your payment could not be processed. Please try again.'}
                </p>
                {txRef && (
                  <div className="bg-muted rounded-lg p-4 mb-6 w-full">
                    <p className="text-sm text-muted-foreground mb-1">Transaction Reference</p>
                    <p className="text-lg font-mono">{txRef}</p>
                  </div>
                )}
                <div className="flex gap-4 w-full">
                  <Button
                    variant="hero"
                    className="flex-1"
                    onClick={() => navigate(-1)}
                  >
                    Try Again
                  </Button>
                  <Link to="/rooms" className="flex-1">
                    <Button variant="outline" className="w-full">
                      Browse Rooms
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BookingSuccess;
