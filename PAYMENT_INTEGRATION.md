# Payment Integration - Chapa & Tele Birr

## Overview
The hotel management system now integrates with Chapa and Tele Birr payment gateways. The payment flow has been changed to **pay first, then create booking** to ensure all bookings are paid.

## Changes Made

### 1. Payment Flow
- **Old Flow**: Create booking → Process payment
- **New Flow**: Initiate payment → Redirect to gateway → Payment callback → Create booking

### 2. Backend Files Created/Updated

#### `backend/api/payment-initiate.php`
- Initiates payment with Chapa or Tele Birr
- Creates a pending payment record
- Returns checkout URL for redirect
- Stores booking data temporarily until payment is confirmed

#### `backend/api/payment-callback.php`
- Handles payment callbacks from gateways
- Verifies payment status
- Creates booking only after payment confirmation
- Updates payment status

#### `backend/api/payment.php`
- Existing payment status checking endpoint
- Can verify payment by transaction ID or booking ID

### 3. Frontend Files Created/Updated

#### `frontend/src/pages/BookingSuccess.tsx`
- New page to show payment success/failure
- Displays booking ID and transaction reference
- Provides navigation to dashboard or retry

#### `frontend/src/pages/Booking.tsx`
- Updated to initiate payment before creating booking
- Redirects to payment gateway
- Removed direct booking creation

#### `frontend/src/lib/api.ts`
- Added `initiatePayment()` method
- Calls `payment-initiate.php` endpoint

### 4. Database Changes

#### New Table: `payment_pending`
Stores payment transactions before booking creation:
```sql
CREATE TABLE IF NOT EXISTS payment_pending (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tx_ref VARCHAR(100) UNIQUE NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    booking_data TEXT NOT NULL,
    return_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**To create this table, run:**
```sql
-- File: database/payment_pending_table.sql
```

### 5. Currency Changes
- All currency displays changed from USD ($) to ETB (Ethiopian Birr)
- Prices now show as "XXX ETB" instead of "$XXX"
- Updated in:
  - Booking page
  - Room details
  - Customer dashboard
  - Admin dashboard
  - Room cards

## Configuration

### Environment Variables
Set these in your `.env` file or server environment:

**Chapa:**
- `CHAPA_SECRET_KEY` - Your Chapa secret key
- `CHAPA_PUBLIC_KEY` - Your Chapa public key
- `CHAPA_BASE_URL` - Chapa API base URL (default: https://api.chapa.co/v1)
- `CHAPA_WEBHOOK_SECRET` - Webhook secret for verification

**Tele Birr:**
- `TELEBIRR_APP_ID` - Your Tele Birr app ID
- `TELEBIRR_APP_KEY` - Your Tele Birr app key
- `TELEBIRR_SHORT_CODE` - Your Tele Birr short code
- `TELEBIRR_BASE_URL` - Tele Birr API base URL
- `TELEBIRR_NOTIFY_URL` - Webhook URL for Tele Birr

**General:**
- `CALLBACK_BASE_URL` - Base URL for payment callbacks (default: http://localhost/hotel-management/backend/api)

## Payment Flow Details

### Step 1: User Initiates Booking
1. User fills booking form
2. Selects payment method (Tele Birr or Chapa)
3. Clicks "Confirm Booking"

### Step 2: Payment Initiation
1. Frontend calls `payment-initiate.php`
2. Backend creates pending payment record
3. Backend calls Chapa/Tele Birr API
4. Returns checkout URL

### Step 3: Payment Gateway
1. User redirected to Chapa/Tele Birr checkout
2. User completes payment
3. Gateway redirects to callback URL

### Step 4: Payment Callback
1. `payment-callback.php` receives callback
2. Verifies payment with gateway
3. If successful:
   - Creates customer (if new)
   - Creates booking
   - Creates payment record
   - Updates pending payment status
4. Redirects to success page

### Step 5: Success Page
1. User sees booking confirmation
2. Booking ID displayed
3. Options to view bookings or book another room

## Testing

### Test Mode
For testing without real API keys:
- Chapa: Use test keys (CHASECK_TEST-...)
- Tele Birr: Currently uses simplified flow (update for production)

### Production Setup
1. Get API keys from Chapa and Tele Birr
2. Set environment variables
3. Update callback URLs to production domain
4. Test payment flow end-to-end
5. Set up webhook verification

## Important Notes

1. **Payment First**: Bookings are only created after successful payment
2. **Pending Payments**: Failed payments remain in `payment_pending` table
3. **Webhook Security**: Implement webhook signature verification in production
4. **Error Handling**: Payment failures redirect to error page with retry option
5. **Currency**: All amounts are in ETB (Ethiopian Birr)

## Next Steps

1. Run the SQL migration to create `payment_pending` table
2. Configure API keys in environment variables
3. Test payment flow with test credentials
4. Update Tele Birr integration for production (currently simplified)
5. Implement webhook signature verification
6. Set up proper error logging and monitoring
