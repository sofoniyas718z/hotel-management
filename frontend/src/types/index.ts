export type RoomType = 'standard' | 'deluxe' | 'suite';
export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
export type CleaningStatus = 'clean' | 'dirty' | 'cleaning' | 'inspection';
export type StaffStatus = 'on-duty' | 'off-duty';
export type UserRole = 'customer' | 'admin' | 'reception';

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  price: number;
  description: string;
  features: string[];
  images: string[];
  maxGuests: number;
  size: number;
  available: boolean;
  cleaningStatus: CleaningStatus;
  lastCleanedAt?: string;
}

export interface Booking {
  id: string;
  roomId: string;
  roomName: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  status: BookingStatus;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  bookings: number;
  joinedAt: string;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: StaffStatus;
  assignedRooms: string[];
  tasksCompleted: number;
}

export interface HousekeepingTask {
  id: string;
  roomId: string;
  roomName: string;
  staffId?: string;
  staffName?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
  completedAt?: string;
}
