# Changes Summary - SafariLodge Updates

## 1. Hotel Name Change
- **Changed**: "Grand Hotel" → "SafariLodge"
- **Files Updated**:
  - `frontend/src/components/Navigation.tsx`
  - `frontend/src/pages/Home.tsx`
  - `frontend/src/pages/Register.tsx`
  - `frontend/src/pages/Login.tsx`
  - `frontend/src/context/AuthContext.tsx`
- **Email domains**: Changed from `@grandhotel.com` to `@safarilodge.com`

## 2. Room Prices Updated
- **Changed**: All room prices increased to above 2000 ETB
- **New Prices**:
  - Single Room: 2,500 ETB/night (was 89.99)
  - Double Room: 3,500 ETB/night (was 129.99)
  - Deluxe Room: 4,500 ETB/night (was 159.99)
  - Suite: 5,500 ETB/night (was 199.99)
- **File Updated**: `database/hotel_management.sql`

## 3. Profile Photo Upload
- **New Feature**: Users can upload and manage profile photos
- **New Files**:
  - `frontend/src/pages/Profile.tsx` - Profile page with photo upload
  - `backend/api/upload.php` - File upload endpoint
  - `backend/uploads/.htaccess` - File access configuration
- **Features**:
  - Upload profile photo (JPEG, PNG, GIF)
  - Max file size: 2MB
  - Preview before upload
  - Remove/replace photo
- **Navigation**: Added "Profile" link to customer navigation menu

## 4. ID Card/Passport Upload in Registration
- **New Feature**: Required ID document upload during registration
- **Files Updated**:
  - `frontend/src/pages/Register.tsx` - Added ID document upload field
  - `frontend/src/context/AuthContext.tsx` - Updated register payload
  - `frontend/src/lib/api.ts` - Updated register API call
  - `backend/api/auth/register.php` - Added ID document fields to database
- **Features**:
  - Choose between ID Card or Passport
  - Upload document (JPEG, PNG, PDF)
  - Max file size: 5MB
  - Preview for image files
  - Required field - registration cannot proceed without ID document
- **Database**: Added `id_document` and `id_document_type` fields to users table

## 5. Database Schema Updates
- **Users Table**: Added new columns
  - `profile_photo VARCHAR(500)` - Profile photo file path
  - `id_document VARCHAR(500)` - ID document file path
  - `id_document_type ENUM('id_card', 'passport')` - Type of ID document

## 6. File Upload System
- **Upload Endpoint**: `backend/api/upload.php`
- **Upload Directories**:
  - `backend/uploads/profiles/` - Profile photos
  - `backend/uploads/id_documents/` - ID cards/passports
- **File Validation**:
  - Profile photos: JPEG, PNG, GIF (max 2MB)
  - ID documents: JPEG, PNG, PDF (max 5MB)
- **Security**: File type and size validation

## Implementation Notes

### To Apply Database Changes:
Run the updated `database/hotel_management.sql` or manually add the new columns:
```sql
ALTER TABLE users 
ADD COLUMN profile_photo VARCHAR(500) DEFAULT NULL,
ADD COLUMN id_document VARCHAR(500) DEFAULT NULL,
ADD COLUMN id_document_type ENUM('id_card', 'passport') DEFAULT NULL;
```

### To Update Room Prices:
Run this SQL to update existing rooms:
```sql
UPDATE rooms SET price_per_night = 2500.00 WHERE room_type = 'single';
UPDATE rooms SET price_per_night = 3500.00 WHERE room_type = 'double';
UPDATE rooms SET price_per_night = 4500.00 WHERE room_type = 'deluxe';
UPDATE rooms SET price_per_night = 5500.00 WHERE room_type = 'suite';
```

### File Upload Permissions:
Ensure the `backend/uploads/` directory has write permissions:
```bash
chmod -R 755 backend/uploads/
```

## Testing Checklist
- [ ] Verify hotel name appears as "SafariLodge" throughout the app
- [ ] Check room prices are above 2000 ETB
- [ ] Test profile photo upload
- [ ] Test ID document upload during registration
- [ ] Verify registration requires ID document
- [ ] Check file uploads are accessible via URL
- [ ] Test profile page displays correctly

