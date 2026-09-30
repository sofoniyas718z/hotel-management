import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Navigation } from '@/components/Navigation';
import { RoomCard } from '@/components/RoomCard';
import { Star, Award, Users, Clock } from 'lucide-react';
import heroImage from '@/assets/hotel-hero.jpg';

// Updated mock rooms with ETB prices matching Rooms.tsx
const featuredRooms = [
  {
    id: '1',
    name: 'Standard Room',
    type: 'standard',
    price: 2500,
    description: 'Comfortable standard accommodation with essential amenities',
    image: '/images/standard-room.jpg',
    amenities: ['Wi-Fi', 'TV', 'Air Conditioning'],
    maxGuests: 2,
    available: true
  },
  {
    id: '2',
    name: 'Deluxe Room',
    type: 'deluxe',
    price: 4500,
    description: 'Spacious deluxe room with premium amenities',
    image: '/images/deluxe-room.jpg',
    amenities: ['Wi-Fi', 'TV', 'Air Conditioning', 'Mini Bar', 'Balcony'],
    maxGuests: 3,
    available: true
  },
  {
    id: '3',
    name: 'Executive Suite',
    type: 'suite',
    price: 7500,
    description: 'Luxurious suite with separate living area',
    image: '/images/executive-suite.jpg',
    amenities: ['Wi-Fi', 'TV', 'Air Conditioning', 'Mini Bar', 'Balcony', 'Jacuzzi'],
    maxGuests: 4,
    available: true
  }
];

const Home = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 gradient-hero" />
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            Experience Luxury & Comfort
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Discover the perfect blend of elegance and hospitality. Book your dream stay at SafariLodge.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/rooms">
              <Button size="lg" variant="hero" className="text-lg px-8">
                Explore Rooms
              </Button>
            </Link>
            <Link to="/booking/1">
              <Button size="lg" variant="outline" className="text-lg px-8 bg-gray/90 hover:bg-white border-white text-foreground">
                Book Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <Card className="text-center gradient-card border-0 shadow-card">
              <CardContent className="pt-8 pb-8">
                <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">5-Star Service</h3>
                <p className="text-sm text-muted-foreground">
                  Award-winning hospitality and premium amenities
                </p>
              </CardContent>
            </Card>

            <Card className="text-center gradient-card border-0 shadow-card">
              <CardContent className="pt-8 pb-8">
                <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Expert Staff</h3>
                <p className="text-sm text-muted-foreground">
                  Professional team dedicated to your comfort
                </p>
              </CardContent>
            </Card>

            <Card className="text-center gradient-card border-0 shadow-card">
              <CardContent className="pt-8 pb-8">
                <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">24/7 Support</h3>
                <p className="text-sm text-muted-foreground">
                  Round-the-clock assistance for all your needs
                </p>
              </CardContent>
            </Card>

            <Card className="text-center gradient-card border-0 shadow-card">
              <CardContent className="pt-8 pb-8">
                <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Prime Location</h3>
                <p className="text-sm text-muted-foreground">
                  Heart of the city with stunning views
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Rooms */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Featured Rooms</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose from our selection of beautifully designed rooms and suites
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
            {featuredRooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>

          <div className="text-center">
            <Link to="/rooms">
              <Button size="lg" variant="hero">
                View All Rooms
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12 px-4">
        <div className="container mx-auto text-center">
          <div className="mb-6">
            <h3 className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">
              SafariLodge
            </h3>
          </div>
          <p className="text-muted-foreground mb-4">
            Ethiopia, Oromia Region · East Shewa · Adama
          </p>
          <p className="text-muted-foreground mb-2">
            Coordinates: 8.541026, 39.270546
          </p>
          <p className="text-muted-foreground">
            Phone: +251 11 234 5678 | Email: info@safarilodge.com
          </p>
          <div className="mt-6 text-sm text-muted-foreground">
            © 2025 SafariLodge. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;