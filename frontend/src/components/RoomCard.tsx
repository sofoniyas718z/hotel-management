import { Link } from 'react-router-dom';
import type { Room } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import roomStandard from '@/assets/room-standard.jpg';
import roomDeluxe from '@/assets/room-deluxe.jpg';
import roomSuite from '@/assets/room-suite.jpg';

interface Props {
  room: Room;
}

const imageForType = (type: Room['type']) => {
  switch (type) {
    case 'deluxe':
      return roomDeluxe;
    case 'suite':
      return roomSuite;
    default:
      return roomStandard;
  }
};

export const RoomCard = ({ room }: Props) => {
  return (
    <Card className="shadow-card h-full flex flex-col">
      <div className="relative h-48 overflow-hidden rounded-t-lg">
        <img
          src={imageForType(room.type)}
          alt={room.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 left-4 flex gap-2">
          <Badge className="capitalize">{room.type}</Badge>
          <Badge variant={room.available ? 'default' : 'secondary'} className={room.available ? 'bg-success' : ''}>
            {room.available ? 'Available' : 'Booked'}
          </Badge>
        </div>
      </div>

      <CardContent className="flex-1 flex flex-col p-6">
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-2">{room.name}</h3>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{room.description}</p>

          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              {room.maxGuests} guest{room.maxGuests !== 1 ? 's' : ''} · {room.size} m²
            </div>
            <div className="text-lg font-bold">{room.price.toLocaleString()} ETB</div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <Link to={`/booking/${room.id}`} className="w-full">
            <Button variant="hero" className="w-full" disabled={!room.available}>
              {room.available ? 'Book Now' : 'Unavailable'}
            </Button>
          </Link>

          <Link to={`/rooms/${room.id}`} className="w-full">
            <Button variant="outline" className="w-full">
              View
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default RoomCard;