import type { Room as ApiRoom } from '@/lib/api';
import type { Room as UiRoom } from '@/types';

const typeMap: Record<string, UiRoom['type']> = {
  single: 'standard',
  double: 'standard',
  suite: 'suite',
  deluxe: 'deluxe',
};

const cleaningStatusMap: Record<string, UiRoom['cleaningStatus']> = {
  clean: 'clean',
  dirty: 'dirty',
  cleaning_in_progress: 'cleaning',
  cleaning: 'cleaning',
  needs_inspection: 'inspection',
  inspection: 'inspection',
};

const defaultFeatures = ['Free Wi-Fi', 'Air Conditioning', 'TV'];

const defaultRoomMeta: Record<UiRoom['type'], { maxGuests: number; size: number }> = {
  standard: { maxGuests: 2, size: 28 },
  deluxe: { maxGuests: 3, size: 40 },
  suite: { maxGuests: 4, size: 60 },
};

export const mapApiRoomToUiRoom = (room: ApiRoom): UiRoom => {
  const type = typeMap[room.room_type] ?? 'standard';
  const features =
    Array.isArray(room.features) && room.features.length > 0
      ? room.features
      : defaultFeatures;

  const meta = defaultRoomMeta[type] ?? defaultRoomMeta.standard;

  return {
    id: String(room.id),
    name: `Room ${room.room_number}`,
    type,
    price: Number(room.price_per_night),
    description:
      room.description ||
      `Comfortable ${type} room with essential amenities.`,
    features,
    images: [],
    maxGuests: meta.maxGuests,
    size: meta.size,
    available: room.status === 'available',
    cleaningStatus: cleaningStatusMap[room.cleaning_status] ?? 'clean',
    lastCleanedAt: room.last_cleaned_at || undefined,
  };
};

