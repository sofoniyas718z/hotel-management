import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { RoomCard } from '@/components/RoomCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiService } from '@/lib/api';
import type { Room } from '@/types';
import { mapApiRoomToUiRoom } from '@/lib/roomMapper';
import { Search, SlidersHorizontal } from 'lucide-react';

// Fallback room data in ETB (Ethiopian Birr)
const fallbackRooms: Room[] = [
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
  },
  {
    id: '4',
    name: 'Presidential Suite',
    type: 'suite',
    price: 12000,
    description: 'Ultra-luxurious suite with premium services',
    image: '/images/presidential-suite.jpg',
    amenities: ['Wi-Fi', 'TV', 'Air Conditioning', 'Mini Bar', 'Balcony', 'Jacuzzi', 'Butler Service'],
    maxGuests: 4,
    available: true
  }
];

const Rooms = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roomType, setRoomType] = useState<string>('all');
  const [priceRange, setPriceRange] = useState([0, 15000]);
  const [showFilters, setShowFilters] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadRooms = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const roomsData = await apiService.getRooms();

        if (!isMounted) return;

        if (!roomsData || !Array.isArray(roomsData)) {
          // Use fallback data if API fails
          console.warn('Using fallback room data');
          setRooms(fallbackRooms);
          return;
        }

        const mapped: Room[] = roomsData.map(mapApiRoomToUiRoom);
        setRooms(mapped);
        
      } catch (err) {
        console.error('Failed to load rooms', err);
        if (isMounted) {
          // Use fallback data on error
          setRooms(fallbackRooms);
          setError('Using demo data. Real rooms will load when connected.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRooms();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = roomType === 'all' || room.type === roomType;
    const matchesPrice = room.price >= priceRange[0] && room.price <= priceRange[1];
    return matchesSearch && matchesType && matchesPrice;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Our Rooms</h1>
          <p className="text-lg text-muted-foreground">
            Find the perfect room for your stay
          </p>
        </div>

        {loading && (
          <Card className="mb-8 p-8 text-center">
            <p className="text-muted-foreground">Loading rooms...</p>
          </Card>
        )}

        {error && !loading && (
          <Card className="mb-8 p-8 text-center border-yellow-400/40 bg-yellow-50">
            <p className="text-yellow-800">{error}</p>
          </Card>
        )}

        {/* Search and Filters */}
        <Card className="mb-8 shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Search & Filter</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="w-4 h-4" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search rooms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {showFilters && (
              <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Room Type</Label>
                  <Select value={roomType} onValueChange={setRoomType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="deluxe">Deluxe</SelectItem>
                      <SelectItem value="suite">Suite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Price Range: {priceRange[0].toLocaleString()} - {priceRange[1].toLocaleString()} ETB</Label>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    min={0}
                    max={15000}
                    step={500}
                    className="mt-2"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {!loading && (
          <>
            <div className="mb-6">
              <p className="text-muted-foreground">
                Showing {filteredRooms.length} of {rooms.length} rooms
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredRooms.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>

            {filteredRooms.length === 0 && (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground text-lg">
                  No rooms found matching your criteria. Try adjusting your filters.
                </p>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Rooms;