// Enhanced API configuration with comprehensive environment support
const getApiBaseUrl = (): string => {
  // Check for environment-specific configurations
  const env = import.meta.env;
  
  // Development environment with proxy support
  if (env.DEV) {
    return env.VITE_DEV_API_BASE_URL || '/api';
  }
  
  // Production environment
  if (env.PROD) {
    return env.VITE_API_BASE_URL || 'http://localhost/hotel-management/backend/api';
  }
  
  // Test environment
  if (env.MODE === 'test') {
    return env.VITE_TEST_API_BASE_URL || 'http://localhost:8000/api';
  }
  
  // Fallback for unknown environments
  return 'http://localhost/hotel-management/backend/api';
};

const API_BASE_URL = getApiBaseUrl();

// Enhanced TypeScript Interfaces with better documentation
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'customer' | 'admin' | 'reception';
  profile_photo?: string;
  id_document?: string;
  passport_document?: string;
  id_document_type?: 'id_card' | 'passport' | 'both';
  verification_status: 'pending' | 'approved' | 'rejected';
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at?: string;
  last_login?: string;
  date_of_birth?: string;
  nationality?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

export interface Room {
  id: string;
  room_number: string;
  name: string;
  type: 'standard' | 'deluxe' | 'suite' | 'single' | 'double' | 'family';
  price: number;
  size: string;
  capacity: number;
  features: string[];
  image_url: string;
  cleaningStatus: 'clean' | 'dirty' | 'cleaning' | 'inspection';
  lastCleanedAt: string | null;
  description?: string;
}

export interface Booking {
  id: number;
  customer_id: number;
  user_id?: number;
  room_id: number;
  room_name: string;
  room_number?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  check_in: string;
  check_out: string;
  total_guests: number;
  total_nights: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'completed' | 'no_show';
  payment_status: 'pending' | 'paid' | 'refunded' | 'failed' | 'partial';
  payment_method?: 'telebirr' | 'chapa' | 'cash' | 'card';
  special_requests?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
  checked_in_at?: string;
  checked_out_at?: string;
}

export interface HousekeepingTask {
  id: number;
  room_id: number;
  room_number?: string;
  room_type?: string;
  staff_id?: number;
  staff_name?: string;
  task_type: 'cleaning' | 'maintenance' | 'inspection' | 'deep_clean';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  estimated_duration?: number;
  actual_duration?: number;
  notes?: string;
  issues_found?: string;
  assigned_at: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface HousekeepingStaff {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'housekeeper' | 'supervisor' | 'manager';
  shift: 'morning' | 'afternoon' | 'night' | 'flexible';
  status: 'active' | 'inactive' | 'on_leave';
  tasks_completed: number;
  rating?: number;
  created_at: string;
  updated_at?: string;
}

export interface PaymentResponse {
  checkout_url: string;
  tx_ref: string;
  booking_id: number;
  payment_method: string;
  amount: number;
  currency: string;
  message?: string;
  expires_at?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
  pagination?: {
    current_page: number;
    total_pages: number;
    total_items: number;
    per_page: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    per_page: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface UploadResponse {
  file_path: string;
  file_name: string;
  document_type: string;
  file_size: number;
  mime_type: string;
  message: string;
}

export interface AdminStats {
  total_users: number;
  total_bookings: number;
  total_revenue: number;
  pending_verifications: number;
  available_rooms: number;
  occupied_rooms: number;
  monthly_revenue: number;
  monthly_bookings: number;
}

// Enhanced error handling with detailed error types
class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: any,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
    
    if (status && [408, 429, 500, 502, 503, 504].includes(status)) {
      this.retryable = true;
    }
  }
}

// Request configuration interface
interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

class ApiService {
  private defaultConfig: RequestConfig = {
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
    credentials: 'include' as RequestCredentials,
  };

  private async fetchWithRetry<T = any>(
    endpoint: string, 
    options: RequestConfig = {}
  ): Promise<T> {
    const config = { ...this.defaultConfig, ...options };
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= config.retries!; attempt++) {
      try {
        return await this.fetchWithTimeout(url, config);
      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof ApiError && !error.retryable) {
          throw error;
        }
        
        if (attempt === config.retries!) {
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, config.retryDelay! * (attempt + 1)));
      }
    }
    
    throw lastError || new ApiError('Request failed after retries', 0, 'RETRY_FAILED');
  }

  private async fetchWithTimeout<T = any>(
    url: string,
    config: RequestConfig
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);
    
    try {
      const fetchConfig: RequestInit = {
        ...config,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
      };

      if (config.body instanceof FormData) {
        delete (fetchConfig.headers as any)['Content-Type'];
      }

      const response = await fetch(url, fetchConfig);
      clearTimeout(timeoutId);

      const rawText = await response.text();
      const cleanedText = rawText.replace(/^\uFEFF+/u, '').trim();

      if (!cleanedText) {
        if (response.ok) {
          return null as T;
        }
        throw new ApiError(`HTTP error! status: ${response.status}`, response.status);
      }

      let data: any;
      try {
        data = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError, 'Response:', cleanedText.slice(0, 200));
        throw new ApiError('Invalid JSON response from server', response.status, 'INVALID_JSON');
      }

      if (!response.ok) {
        const errorMessage = data.message || data.error || `HTTP error! status: ${response.status}`;
        throw new ApiError(
          errorMessage,
          response.status,
          data.code,
          data.details,
          [408, 429, 500, 502, 503, 504].includes(response.status)
        );
      }

      if (data.success === false) {
        throw new ApiError(
          data.message || 'Request failed',
          response.status,
          data.code,
          data.data
        );
      }

      return data;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof ApiError) {
        const isAuthEndpoint = url.includes('auth/');
        const is401 = error.status === 401;
        
        if (!(isAuthEndpoint && is401)) {
          console.error(`API Error [${url}]:`, {
            message: error.message,
            status: error.status,
            code: error.code,
            details: error.details,
            retryable: error.retryable
          });
        }
        throw error;
      }

      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408, 'TIMEOUT', null, true);
      }

      if (error instanceof TypeError) {
        console.error(`Network Error [${url}]:`, error.message);
        throw new ApiError(
          'Unable to connect to server. Please check your internet connection.',
          0,
          'NETWORK_ERROR',
          null,
          true
        );
      }

      console.error(`Unknown API Error [${url}]:`, error);
      throw new ApiError(
        'An unexpected error occurred. Please try again.',
        500,
        'UNKNOWN_ERROR'
      );
    }
  }

  private async fetchApi<T = any>(
    endpoint: string, 
    options: RequestConfig = {}
  ): Promise<T> {
    return this.fetchWithRetry<T>(endpoint, options);
  }

  // FIXED: Enhanced Room APIs with proper error handling
  async getRooms(params?: {
    type?: string;
    available?: boolean;
    min_price?: number;
    max_price?: number;
    page?: number;
    limit?: number;
    sort_by?: 'price' | 'name' | 'created_at';
    sort_order?: 'asc' | 'desc';
  }): Promise<Room[]> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const queryString = queryParams.toString();
    const endpoint = `rooms.php${queryString ? `?${queryString}` : ''}`;
    
    console.log('🚀 Fetching rooms from:', endpoint);
    
    try {
      const response = await this.fetchApi<any>(endpoint);
      console.log('📦 Raw rooms response:', response);

      let roomsArray: any[] = [];
      
      if (Array.isArray(response)) {
        console.log('✅ API returned array directly');
        roomsArray = response;
      } else if (response.success && Array.isArray(response.data)) {
        console.log('✅ API returned success with data array');
        roomsArray = response.data;
      } else if (response.data && Array.isArray(response.data)) {
        console.log('✅ API returned data array');
        roomsArray = response.data;
      } else if (Array.isArray(response.rooms)) {
        console.log('✅ API returned rooms array');
        roomsArray = response.rooms;
      } else if (response.success && response.data) {
        console.log('⚠️ API returned single room, wrapping in array');
        roomsArray = [response.data];
      } else {
        console.warn('❌ Unexpected API response structure, returning empty array');
        roomsArray = [];
      }

      console.log(`✅ Found ${roomsArray.length} rooms`);
      return roomsArray;
      
    } catch (error) {
      console.error('❌ getRooms API call failed:', error);
      return [];
    }
  }

  async getRoom(id: number): Promise<Room> {
    console.log('🔄 Fetching room with ID:', id);
    try {
      const response = await this.fetchApi<any>(`rooms.php?id=${id}`);
      console.log('📦 Raw room response:', response);

      if (response.success && response.data) {
        return response.data;
      } else if (response.data) {
        return response.data;
      } else if (response.success && Array.isArray(response.data)) {
        return response.data[0];
      } else {
        throw new ApiError('Room not found', 404);
      }
    } catch (error) {
      console.error('❌ getRoom API call failed:', error);
      throw error;
    }
  }

  // FIXED: Room cleaning status update
  async updateRoomCleaningStatus(
    roomId: number, 
    status: string,
    notes?: string
  ): Promise<ApiResponse<Room>> {
    console.log('🔄 Updating room cleaning status:', { roomId, status, notes });
    
    try {
      const response = await this.fetchApi<ApiResponse<Room>>('rooms.php', {
        method: 'PUT',
        body: JSON.stringify({ 
          id: roomId, 
          cleaning_status: status,
          maintenance_notes: notes 
        }),
      });
      
      console.log('✅ Room status updated successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ updateRoomCleaningStatus failed:', error);
      throw error;
    }
  }

  // Enhanced Booking APIs
  async createBooking(bookingData: {
    user_id?: number;
    room_id: number;
    check_in: string;
    check_out: string;
    total_guests: number;
    customer?: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
    };
    special_requests?: string;
    payment_method?: string;
  }): Promise<ApiResponse<{ booking_id: number; tx_ref?: string; total_amount: number }>> {
    return this.fetchApi('bookings.php', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  async getBookings(params?: {
    user_id?: number;
    status?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Promise<Booking[]> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const queryString = queryParams.toString();
    const endpoint = `bookings.php${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.fetchApi<ApiResponse<Booking[]>>(endpoint);
    return response.data;
  }

  async updateBookingStatus(
    bookingId: number, 
    status: Booking['status'],
    notes?: string
  ): Promise<ApiResponse<Booking>> {
    return this.fetchApi('bookings.php', {
      method: 'PUT',
      body: JSON.stringify({ 
        id: bookingId, 
        status,
        admin_notes: notes 
      }),
    });
  }

  async cancelBooking(bookingId: number, reason?: string): Promise<ApiResponse<Booking>> {
    return this.updateBookingStatus(bookingId, 'cancelled', reason);
  }

  // Enhanced Housekeeping APIs
  async getHousekeepingTasks(params?: {
    status?: string;
    staff_id?: number;
    priority?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Promise<HousekeepingTask[]> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const queryString = queryParams.toString();
    const endpoint = `housekeeping.php${queryString ? `?${queryString}` : ''}`;
    
    try {
      const response = await this.fetchApi<ApiResponse<HousekeepingTask[]>>(endpoint);
      return response.data || [];
    } catch (error) {
      console.error('❌ getHousekeepingTasks failed:', error);
      return [];
    }
  }

  async getHousekeepingStaff(): Promise<HousekeepingStaff[]> {
    try {
      const response = await this.fetchApi<ApiResponse<HousekeepingStaff[]>>('housekeeping.php?staff=1');
      return response.data || [];
    } catch (error) {
      console.error('❌ getHousekeepingStaff failed:', error);
      return [];
    }
  }

  async createHousekeepingTask(taskData: {
    room_id: number;
    staff_id?: number;
    task_type: 'cleaning' | 'maintenance' | 'inspection' | 'deep_clean';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    estimated_duration?: number;
    notes?: string;
  }): Promise<ApiResponse<{ task_id: number }>> {
    return this.fetchApi('housekeeping.php', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async updateHousekeepingTaskStatus(
    taskId: number, 
    status: HousekeepingTask['status'],
    actual_duration?: number,
    issues_found?: string
  ): Promise<ApiResponse<HousekeepingTask>> {
    return this.fetchApi('housekeeping.php', {
      method: 'PUT',
      body: JSON.stringify({ 
        id: taskId, 
        status,
        actual_duration,
        issues_found 
      }),
    });
  }

  // Enhanced Auth APIs
  async login(credentials: { 
    username?: string; 
    email?: string; 
    password: string; 
  }): Promise<ApiResponse<{ user: User; token: string }>> {
    const payload = {
      username: credentials.username || credentials.email || '',
      password: credentials.password,
    };

    return this.fetchApi('auth/login.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
    id_document?: string;
    passport_document?: string;
    id_document_type?: 'id_card' | 'passport' | 'both';
    date_of_birth?: string;
    nationality?: string;
    address?: string;
  }): Promise<ApiResponse<{ 
    user: User; 
    token: string; 
    requires_verification: boolean;
    verification_status: string;
  }>> {
    return this.fetchApi('auth/register.php', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async uploadDocument(
    file: File, 
    type: 'id' | 'passport', 
    userId?: string
  ): Promise<ApiResponse<UploadResponse>> {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('type', type);
    if (userId) {
      formData.append('user_id', userId);
    }

    return this.fetchApi('auth/upload-document.php', {
      method: 'POST',
      body: formData,
      timeout: 60000,
    });
  }

  // Enhanced Payment APIs
  async initiatePayment(paymentData: {
    amount: number;
    payment_method: 'telebirr' | 'chapa';
    customer: {
      email: string;
      first_name: string;
      last_name: string;
      phone?: string;
    };
    booking_data: {
      room_id: number;
      check_in: string;
      check_out: string;
      total_guests: number;
      special_requests?: string;
      id_document?: string;
      id_document_type?: 'id_card' | 'passport';
    };
    user_id?: string | number;
    return_url?: string;
  }): Promise<ApiResponse<PaymentResponse>> {
    return this.fetchApi('payment-initiate.php', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  async getPaymentStatus(params: {
    transaction_id?: string;
    booking_id?: number;
    tx_ref?: string;
  }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value.toString());
    });

    const queryString = queryParams.toString();
    const endpoint = `payment.php${queryString ? `?${queryString}` : ''}`;
    
    return this.fetchApi(endpoint);
  }

  async confirmPayment(confirmationData: {
    tx_ref: string;
    booking_id: number;
  }): Promise<ApiResponse<{ message: string; booking: Booking }>> {
    return this.fetchApi('payment-success.php', {
      method: 'POST',
      body: JSON.stringify(confirmationData),
    });
  }

  // Admin APIs
  async getAdminStats(): Promise<ApiResponse<AdminStats>> {
    return this.fetchApi('admin/stats.php');
  }

  async getPendingVerifications(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ users: User[]; pagination: any }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const endpoint = `admin/users.php${queryString ? `?${queryString}` : ''}&verification_status=pending`;
    
    return this.fetchApi(endpoint);
  }

  async updateUserVerification(
    userId: number, 
    action: 'approve' | 'reject',
    reason?: string
  ): Promise<ApiResponse<User>> {
    return this.fetchApi('admin/users.php', {
      method: 'PUT',
      body: JSON.stringify({
        user_id: userId,
        action: action,
        reason: reason
      }),
    });
  }

  async getCustomers(): Promise<ApiResponse<{ users: User[]; pagination?: any }>> {
    return this.fetchApi('admin/users.php?role=customer');
  }

  async createRoom(roomData: {
    room_number: string;
    room_type: string;
    price_per_night: number;
    description?: string;
    features?: string[];
    max_guests?: number;
  }): Promise<ApiResponse<Room>> {
    return this.fetchApi('rooms.php', {
      method: 'POST',
      body: JSON.stringify(roomData),
    });
  }

  async createHousekeepingStaff(staffData: {
    name: string;
    email: string;
    phone: string;
    shift: 'morning' | 'afternoon' | 'night' | 'flexible';
  }): Promise<ApiResponse<HousekeepingStaff>> {
    return this.fetchApi('housekeeping.php?staff=1', {
      method: 'POST',
      body: JSON.stringify(staffData),
    });
  }

  // Utility methods
  async healthCheck(): Promise<{ healthy: boolean; responseTime: number }> {
    const startTime = performance.now();
    
    try {
      await this.fetchApi('health.php', { timeout: 5000 });
      const responseTime = performance.now() - startTime;
      
      return {
        healthy: true,
        responseTime: Math.round(responseTime)
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      return {
        healthy: false,
        responseTime: Math.round(responseTime)
      };
    }
  }

  getApiBaseUrl(): string {
    return API_BASE_URL;
  }

  // Method to check if user can book (verification status)
  canUserBook(user: User): { canBook: boolean; reason?: string } {
    if (!user.is_active) {
      return { canBook: false, reason: 'Account is deactivated' };
    }
    
    if (user.verification_status === 'pending') {
      return { canBook: false, reason: 'Account verification pending' };
    }
    
    if (user.verification_status === 'rejected') {
      return { canBook: false, reason: 'Account verification rejected' };
    }
    
    return { canBook: true };
  }
}

// Create and export singleton instance
export const apiService = new ApiService();

// Utility function for API URL construction
export const buildApiUrl = (endpoint: string, params?: Record<string, any>): string => {
  const baseUrl = apiService.getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  if (!params) return url;
  
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value.toString());
    }
  });
  
  const queryString = queryParams.toString();
  return queryString ? `${url}?${queryString}` : url;
};

// Export ApiError as a named export
export { ApiError };