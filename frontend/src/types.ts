// Room related types
export interface Room {
  id: string;
  name: string;
  type: string;
  price: number;
  description: string;
  features: string[];
  maxGuests: number;
  size: string;
  available: boolean;
  cleaningStatus: string;
  lastCleanedAt?: string;
}

// Booking related types
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
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
  createdAt: string;
}

// User related types
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'staff' | 'customer';
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form types
export interface LoginFormData {
  username: string;
  password: string;
}

export interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

// Dashboard stats
export interface DashboardStats {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  totalRevenue: number;
  totalBookings: number;
  pendingBookings: number;
}

// Customer types
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  totalBookings: number;
  lastBooking: string;
}

// Housekeeping types
export interface HousekeepingTask {
  id: string;
  roomId: string;
  roomNumber: string;
  taskType: 'cleaning' | 'maintenance' | 'inspection';
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignedTo?: string;
  assignedAt: string;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
}

// Payment types
export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  paymentMethod: 'credit_card' | 'debit_card' | 'cash' | 'online';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  paymentDate: string;
}