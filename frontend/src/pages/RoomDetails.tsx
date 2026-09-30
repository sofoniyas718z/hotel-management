import { useParams, Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockRooms } from '@/data/mockData';
import { Users, Maximize, Wifi, Wind, Tv, Coffee, Bath, Check } from 'lucide-react';
import roomStandard from '@/assets/room-standard.jpg';
import roomDeluxe from '@/assets/room-deluxe.jpg';
import roomSuite from '@/assets/room-suite.jpg';

const roomImages = {
  standard: roomStandard,
  deluxe: roomDeluxe,
  suite: roomSuite,
};

const RoomDetails = () => {
  const { id } = useParams();
  const room = mockRooms.find((r) => r.id === id);

  if (!room) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl font-bold mb-4">Room Not Found</h1>
          <Link to="/rooms">
            <Button variant="hero">Browse All Rooms</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Main Image */}
            <div className="relative h-[500px] rounded-lg overflow-hidden shadow-elegant">
              <img
                src={roomImages[room.type]}
                alt={room.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-6 left-6 flex gap-2">
                <Badge className="gradient-primary text-primary-foreground capitalize text-base px-4 py-1">
                  {room.type}
                </Badge>
                <Badge
                  variant={room.available ? 'default' : 'secondary'}
                  className={`text-base px-4 py-1 ${room.available ? 'bg-success' : 'bg-muted'}`}
                >
                  {room.available ? 'Available' : 'Booked'}
                </Badge>
              </div>
            </div>

            {/* Room Info */}
            <Card className="shadow-card">
              <CardContent className="p-8">
                <h1 className="text-4xl font-bold mb-4">{room.name}</h1>
                <div className="flex items-center gap-6 text-muted-foreground mb-6">
                  <span className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Up to {room.maxGuests} Guests
                  </span>
                  <span className="flex items-center gap-2">
                    <Maximize className="w-5 h-5" />
                    {room.size} m²
                  </span>
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {room.description}
                </p>
              </CardContent>
            </Card>

            {/* Features & Amenities */}
            <Card className="shadow-card">
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold mb-6">Amenities</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {room.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {feature.includes('Wi-Fi') && <Wifi className="w-5 h-5 text-primary" />}
                        {feature.includes('Air Conditioning') && <Wind className="w-5 h-5 text-primary" />}
                        {feature.includes('TV') && <Tv className="w-5 h-5 text-primary" />}
                        {feature.includes('Coffee') && <Coffee className="w-5 h-5 text-primary" />}
                        {feature.includes('Bath') && <Bath className="w-5 h-5 text-primary" />}
                        {!feature.includes('Wi-Fi') &&
                          !feature.includes('Air Conditioning') &&
                          !feature.includes('TV') &&
                          !feature.includes('Coffee') &&
                          !feature.includes('Bath') && (
                            <Check className="w-5 h-5 text-primary" />
                          )}
                      </div>
                      <span className="text-foreground font-medium">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 shadow-elegant gradient-card">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <div className="text-5xl font-bold text-primary mb-2">
                    ${room.price}
                  </div>
                  <div className="text-muted-foreground">per night</div>
                </div>

                <div className="space-y-4">
                  <Link to={`/booking/${room.id}`}>
                    <Button
                      variant="hero"
                      size="lg"
                      className="w-full text-lg"
                      disabled={!room.available}
                    >
                      {room.available ? 'Book This Room' : 'Currently Unavailable'}
                    </Button>
                  </Link>

                  <div className="pt-4 border-t border-border space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Room Type</span>
                      <span className="font-medium capitalize">{room.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Guests</span>
                      <span className="font-medium">{room.maxGuests} People</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Room Size</span>
                      <span className="font-medium">{room.size} m²</span>
                    </div>
                    {room.cleaningStatus === 'clean' && room.lastCleanedAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Cleaned</span>
                        <span className="font-medium text-success">Today</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-border">
                    <h3 className="font-semibold mb-3">What's Included</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-success flex-shrink-0" />
                        Free cancellation up to 24 hours
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-success flex-shrink-0" />
                        Free Wi-Fi throughout stay
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-success flex-shrink-0" />
                        24/7 room service
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-success flex-shrink-0" />
                        Daily housekeeping
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomDetails;
