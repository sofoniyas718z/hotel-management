import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Users, CreditCard, AlertCircle, FileText, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';
import { mapApiRoomToUiRoom } from '@/lib/roomMapper';
import type { Room } from '@/types';
import roomStandard from '@/assets/room-standard.jpg';
import roomDeluxe from '@/assets/room-deluxe.jpg';
import roomSuite from '@/assets/room-suite.jpg';
import { useAuth } from '@/hooks/useAuth';

const roomImages = {
  standard: roomStandard,
  deluxe: roomDeluxe,
  suite: roomSuite,
};

const Booking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    checkIn: '',
    checkOut: '',
    guests: 1,
    name: '',
    email: '',
    phone: '',
    specialRequests: '',
    paymentMethod: 'telebirr' as 'telebirr' | 'chapa',
    idDocument: null as File | null,
    idDocumentType: 'id_card' as 'id_card' | 'passport',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [idDocumentPreview, setIdDocumentPreview] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState(false);
  const [idDocumentPath, setIdDocumentPath] = useState<string | null>(null);

  // Calculate nights and validate dates
  const calculateNights = () => {
    if (formData.checkIn && formData.checkOut) {
      const start = new Date(formData.checkIn);
      const end = new Date(formData.checkOut);
      const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return nights > 0 ? nights : 0;
    }
    return 0;
  };

  const nights = calculateNights();

  // Load room details
  useEffect(() => {
    if (!id) {
      setError('Room ID is required');
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadRoom = async () => {
      try {
        setLoading(true);
        setError(null);

        const numericId = Number(id);
        if (Number.isNaN(numericId)) {
          throw new Error('Invalid room ID');
        }

        const apiRoom = await apiService.getRoom(numericId);
        if (!isMounted) return;

        if (!apiRoom) {
          throw new Error('Room not found');
        }

        setRoom(mapApiRoomToUiRoom(apiRoom));
      } catch (err) {
        console.error('Failed to load room for booking', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unable to load this room. Please try another one.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRoom();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Auto-fill user data
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    setFormData(prev => ({
      ...prev,
      name: prev.name || user.name || '',
      email: prev.email || user.email || '',
      phone: prev.phone || user.phone || '',
    }));
  }, [user, navigate]);

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.checkIn) {
      errors.checkIn = 'Check-in date is required';
    }

    if (!formData.checkOut) {
      errors.checkOut = 'Check-out date is required';
    }

    if (formData.checkIn && formData.checkOut) {
      const start = new Date(formData.checkIn);
      const end = new Date(formData.checkOut);
      
      if (end <= start) {
        errors.checkOut = 'Check-out date must be after check-in date';
      }

      if (nights <= 0) {
        errors.checkOut = 'Please select valid dates';
      }
    }

    if (!formData.name.trim()) {
      errors.name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    }

    if (formData.guests < 1) {
      errors.guests = 'At least 1 guest is required';
    } else if (room && formData.guests > room.maxGuests) {
      errors.guests = `Maximum ${room.maxGuests} guests allowed for this room`;
    }

    if (!idDocumentPath) {
      errors.idDocument = 'ID card or passport is required for booking';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Calculate pricing
  const subtotal = room ? room.price * nights : 0;
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to make a booking.',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    if (!room) {
      toast({
        title: 'Room Unavailable',
        description: 'Please select another room.',
        variant: 'destructive',
      });
      return;
    }

    // Validate form
    if (!validateForm()) {
    toast({
        title: 'Please fix the errors',
        description: 'Some information is missing or invalid.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      
      // Prepare customer data
      const nameParts = formData.name.split(' ');
      const firstName = nameParts[0] || formData.name;
      const lastName = nameParts.slice(1).join(' ') || 'Guest';
      
      // Initiate payment
      const paymentResponse = await apiService.initiatePayment({
        amount: total,
        payment_method: formData.paymentMethod,
        customer: {
          email: formData.email,
          first_name: firstName,
          last_name: lastName,
          phone: formData.phone,
        },
        booking_data: {
          room_id: Number(room.id),
          check_in: formData.checkIn,
          check_out: formData.checkOut,
          total_guests: formData.guests,
          special_requests: formData.specialRequests || undefined,
          id_document: idDocumentPath || undefined,
          id_document_type: formData.idDocumentType,
        },
        user_id: user.id,
        return_url: `${window.location.origin}/payment-success`,
      });

      // Check response structure - Response class returns { message, data }
      const checkoutUrl = paymentResponse.data?.checkout_url;
      if (checkoutUrl) {
        // Redirect to payment gateway
        window.location.href = checkoutUrl;
      } else {
        // Log the actual response for debugging
        console.error('Payment response:', paymentResponse);
        throw new Error('Payment gateway did not return checkout URL. Please try again.');
      }
    } catch (err) {
      console.error('Failed to initiate payment', err);
      toast({
        title: 'Payment Initialization Failed',
        description: err instanceof Error ? err.message : 'We could not initialize payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle input changes with validation
  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle ID document upload
  const handleIdDocumentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG, PNG, or PDF file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "File size must be less than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setFormData((prev) => ({ ...prev, idDocument: file }));

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdDocumentPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setIdDocumentPreview(null);
    }

    // Upload file
    try {
      setUploadingId(true);
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('type', 'id_document');

      const response = await fetch('/api/upload.php', {
        method: 'POST',
        body: uploadFormData,
      });

      const result = await response.json();
      if (result.success && result.data?.file_path) {
        setIdDocumentPath(result.data.file_path);
        toast({
          title: "Document uploaded",
          description: "Your ID document has been uploaded successfully.",
        });
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload document. Please try again.",
        variant: "destructive",
      });
      setFormData((prev) => ({ ...prev, idDocument: null }));
      setIdDocumentPreview(null);
    } finally {
      setUploadingId(false);
    }
  };

  const removeIdDocument = () => {
    setFormData((prev) => ({ ...prev, idDocument: null }));
    setIdDocumentPreview(null);
    setIdDocumentPath(null);
  };

  // Get minimum date for date inputs (today)
  const getMinDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Get minimum check-out date (day after check-in)
  const getMinCheckoutDate = () => {
    if (!formData.checkIn) return getMinDate();
    const nextDay = new Date(formData.checkIn);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-4">Loading room details...</h1>
              <p className="text-muted-foreground">Please wait while we prepare your booking.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center max-w-md mx-auto">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-4">Room Not Available</h1>
            <p className="text-muted-foreground mb-6">
              {error || 'The room you are looking for is not available.'}
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => navigate(-1)}>
                Go Back
              </Button>
          <Button variant="hero" onClick={() => navigate('/rooms')}>
            Browse All Rooms
          </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Complete Your Booking</h1>
            <p className="text-muted-foreground">
              Review your stay details and complete the payment to confirm your booking
            </p>
          </div>

        <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Stay Details */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Stay Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="checkIn">Check-in Date</Label>
                      <Input
                        id="checkIn"
                        type="date"
                        value={formData.checkIn}
                          onChange={(e) => handleInputChange('checkIn', e.target.value)}
                          min={getMinDate()}
                        required
                          className={formErrors.checkIn ? 'border-destructive' : ''}
                      />
                        {formErrors.checkIn && (
                          <p className="text-sm text-destructive">{formErrors.checkIn}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkOut">Check-out Date</Label>
                      <Input
                        id="checkOut"
                        type="date"
                        value={formData.checkOut}
                          onChange={(e) => handleInputChange('checkOut', e.target.value)}
                          min={getMinCheckoutDate()}
                        required
                          className={formErrors.checkOut ? 'border-destructive' : ''}
                      />
                        {formErrors.checkOut && (
                          <p className="text-sm text-destructive">{formErrors.checkOut}</p>
                        )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guests">Number of Guests</Label>
                    <Input
                      id="guests"
                      type="number"
                      min="1"
                      max={room.maxGuests}
                      value={formData.guests}
                        onChange={(e) => handleInputChange('guests', parseInt(e.target.value))}
                      required
                        className={formErrors.guests ? 'border-destructive' : ''}
                      />
                      {formErrors.guests ? (
                        <p className="text-sm text-destructive">{formErrors.guests}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Maximum {room.maxGuests} guests for this room type
                        </p>
                      )}
                  </div>
                </CardContent>
              </Card>

              {/* Guest Information */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Guest Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                        className={formErrors.name ? 'border-destructive' : ''}
                    />
                      {formErrors.name && (
                        <p className="text-sm text-destructive">{formErrors.name}</p>
                      )}
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                        required
                          className={formErrors.email ? 'border-destructive' : ''}
                      />
                        {formErrors.email && (
                          <p className="text-sm text-destructive">{formErrors.email}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                          placeholder="+251 91 234 5678"
                        value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                        required
                          className={formErrors.phone ? 'border-destructive' : ''}
                      />
                        {formErrors.phone && (
                          <p className="text-sm text-destructive">{formErrors.phone}</p>
                        )}
                    </div>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="specialRequests">Special Requests (Optional)</Label>
                    <Textarea
                        id="specialRequests"
                        placeholder="Any special requirements, preferences, or additional information..."
                      value={formData.specialRequests}
                        onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* ID Document Type */}
                  <div className="space-y-2">
                    <Label>ID Document Type *</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="idDocumentType"
                          value="id_card"
                          checked={formData.idDocumentType === "id_card"}
                          onChange={(e) => handleInputChange('idDocumentType', e.target.value)}
                          className="w-4 h-4 text-primary"
                        />
                        <span>ID Card</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="idDocumentType"
                          value="passport"
                          checked={formData.idDocumentType === "passport"}
                          onChange={(e) => handleInputChange('idDocumentType', e.target.value)}
                          className="w-4 h-4 text-primary"
                        />
                        <span>Passport</span>
                      </label>
                    </div>
                  </div>

                  {/* ID Document Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="idDocument">
                      {formData.idDocumentType === "id_card" ? "ID Card" : "Passport"} (Required) *
                    </Label>
                    {!idDocumentPath ? (
                      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                        <input
                          type="file"
                          id="idDocument"
                          accept="image/*,.pdf"
                          onChange={handleIdDocumentChange}
                          className="hidden"
                          required
                        />
                        <label htmlFor="idDocument" className="cursor-pointer">
                          <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mb-1">
                            Click to upload {formData.idDocumentType === "id_card" ? "ID Card" : "Passport"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            JPEG, PNG, or PDF (Max 5MB)
                          </p>
                        </label>
                      </div>
                    ) : (
                      <div className="border border-border rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {idDocumentPreview ? (
                            <img
                              src={idDocumentPreview}
                              alt="ID Document"
                              className="w-16 h-16 object-cover rounded"
                            />
                          ) : (
                            <FileText className="w-8 h-8 text-primary" />
                          )}
                          <div>
                            <p className="text-sm font-medium">
                              {formData.idDocument?.name || "Document uploaded"}
                            </p>
                            <p className="text-xs text-muted-foreground">Uploaded successfully</p>
                          </div>
                        </div>
                        <Button 
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={removeIdDocument}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    {uploadingId && (
                      <p className="text-sm text-muted-foreground">Uploading...</p>
                    )}
                    {formErrors.idDocument && (
                      <p className="text-sm text-destructive">{formErrors.idDocument}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

                {/* Payment Method */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                      Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 border rounded-lg hover:border-primary transition-colors">
                        <input
                          type="radio"
                          id="telebirr"
                          name="paymentMethod"
                          value="telebirr"
                          checked={formData.paymentMethod === 'telebirr'}
                          onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                          className="w-4 h-4 text-primary"
                        />
                        <Label htmlFor="telebirr" className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">Tele Birr</span>
                              <p className="text-sm text-muted-foreground">Mobile Money Payment</p>
                            </div>
                            <div className="text-sm font-medium text-primary">ETB</div>
                          </div>
                        </Label>
                  </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg hover:border-primary transition-colors">
                        <input
                          type="radio"
                          id="chapa"
                          name="paymentMethod"
                          value="chapa"
                          checked={formData.paymentMethod === 'chapa'}
                          onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                          className="w-4 h-4 text-primary"
                        />
                        <Label htmlFor="chapa" className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">Chapa</span>
                              <p className="text-sm text-muted-foreground">Online Payment Gateway</p>
                            </div>
                            <div className="text-sm font-medium text-primary">ETB</div>
                          </div>
                        </Label>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                      Your payment will be processed securely through {formData.paymentMethod === 'telebirr' ? 'Tele Birr' : 'Chapa'}.
                      You will be redirected to the payment page to complete your transaction.
                  </p>
                </CardContent>
              </Card>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  size="lg" 
                  variant="hero" 
                  className="w-full text-lg h-14" 
                  disabled={submitting || uploadingId}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing Payment...
                    </>
                  ) : (
                    `Pay ${total.toLocaleString()} ETB - Confirm Booking`
                  )}
              </Button>
            </form>
          </div>

            {/* Booking Summary Sidebar */}
          <div className="lg:col-span-1">
              <Card className="sticky top-24 shadow-elegant gradient-card border-0">
              <CardHeader>
                  <CardTitle className="text-xl">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                  {/* Room Info */}
                <div className="flex gap-4">
                  <img
                    src={roomImages[room.type]}
                    alt={room.name}
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                  />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-lg truncate">{room.name}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{room.type} Room</p>
                      <p className="text-sm font-medium text-primary mt-1">
                        {room.price.toLocaleString()} ETB / night
                      </p>
                  </div>
                </div>

                  {/* Stay Details */}
                <div className="space-y-3 py-4 border-y border-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Check-in</span>
                      <span className="font-medium text-foreground">
                        {formData.checkIn ? new Date(formData.checkIn).toLocaleDateString() : '--'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Check-out</span>
                      <span className="font-medium text-foreground">
                        {formData.checkOut ? new Date(formData.checkOut).toLocaleDateString() : '--'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium text-foreground">
                        {nights} night{nights !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Guests</span>
                      <span className="font-medium text-foreground">{formData.guests}</span>
                  </div>
                </div>

                  {/* Price Breakdown */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                        Room rate ({nights} night{nights !== 1 ? 's' : ''})
                    </span>
                      <span className="font-medium">{subtotal.toLocaleString()} ETB</span>
                  </div>
                  <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taxes & Fees</span>
                      <span className="font-medium">{tax.toLocaleString()} ETB</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-3 border-t border-border">
                      <span>Total Amount</span>
                      <span className="text-primary">{total.toLocaleString()} ETB</span>
                    </div>
                  </div>

                  {/* Payment Method Display */}
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Payment method: <span className="font-medium capitalize">{formData.paymentMethod}</span>
                    </p>
                </div>
              </CardContent>
            </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;