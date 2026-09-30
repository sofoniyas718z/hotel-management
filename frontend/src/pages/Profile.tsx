import { useState, useEffect, useRef } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { User, Upload, X, Camera, Loader2 } from 'lucide-react';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.profilePhoto) {
      setProfilePhoto(user.profilePhoto);
    }
  }, [user]);

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG, PNG, or GIF image.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Profile photo must be less than 5MB.",
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePhoto(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    await uploadProfilePhoto(file);
  };

  const uploadProfilePhoto = async (file: File) => {
    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'profile');
      formData.append('user_id', user?.id?.toString() || '');
      formData.append('action', 'upload_profile');

      console.log('=== UPLOAD DEBUG START ===');
      console.log('User ID:', user?.id);
      console.log('File:', file.name, file.size, file.type);
      
      // Log FormData contents
      for (let [key, value] of formData.entries()) {
        console.log('FormData:', key, value);
      }

      const response = await fetch('http://localhost/hotel-management/backend/api/upload.php', {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      const responseText = await response.text();
      console.log('Raw response length:', responseText.length);
      console.log('Raw response:', responseText);

      if (!responseText) {
        throw new Error('Server returned completely empty response. Check PHP errors.');
      }

      const cleanResponse = responseText.replace(/^\uFEFF/, '').trim();
      
      if (!cleanResponse) {
        throw new Error('Server returned empty response after cleaning');
      }

      let result;
      try {
        result = JSON.parse(cleanResponse);
        console.log('Parsed result:', result);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Response that failed to parse:', cleanResponse);
        throw new Error(`Server returned invalid JSON. First 200 chars: ${cleanResponse.substring(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(result.error || result.message || `Upload failed with status: ${response.status}`);
      }

      if (result.success && result.data?.file_url) {
        const photoUrl = result.data.file_url;
        
        console.log('Upload successful! Photo URL:', photoUrl);
        console.log('Database updated:', result.data.database_updated);
        
        // Update local state
        setProfilePhoto(photoUrl);
        
        // Update user context
        if (updateUser && user) {
          updateUser({ ...user, profilePhoto: photoUrl });
        }

        toast({
          title: "Success!",
          description: "Your profile photo has been updated successfully.",
        });

        console.log('=== UPLOAD DEBUG END ===');

      } else {
        throw new Error(result.error || result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      console.log('=== UPLOAD DEBUG END ===');
      
      let errorMessage = "Failed to upload photo. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });

      setProfilePhoto(user?.profilePhoto || null);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    try {
      setUploading(true);
      
      const response = await fetch('http://localhost/hotel-management/backend/api/upload.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `action=remove_profile&user_id=${user?.id}`
      });

      const responseText = await response.text();
      const cleanResponse = responseText.replace(/^\uFEFF/, '').trim();
      const result = JSON.parse(cleanResponse);

      if (result.success) {
        setProfilePhoto(null);
        
        if (updateUser && user) {
          updateUser({ ...user, profilePhoto: null });
        }

        toast({
          title: "Photo removed",
          description: "Your profile photo has been removed.",
        });
      } else {
        throw new Error(result.error || 'Failed to remove photo');
      }
    } catch (error) {
      console.error('Remove photo error:', error);
      toast({
        title: "Remove failed",
        description: "Failed to remove profile photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">My Profile</h1>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Profile Photo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center">
                  <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-border mb-4 bg-muted">
                    {profilePhoto ? (
                      <img
                        src={profilePhoto}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={() => setProfilePhoto(null)}
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <User className="w-16 h-16 text-muted-foreground" />
                      </div>
                    )}
                    
                    {uploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    disabled={uploading}
                  />
                  
                  <div className="flex flex-col gap-2 w-full">
                    {!profilePhoto ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleUploadClick}
                        disabled={uploading}
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Camera className="w-4 h-4 mr-2" />
                            Upload Photo
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="flex gap-2 w-full">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          size="sm"
                          onClick={handleUploadClick}
                          disabled={uploading}
                        >
                          {uploading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={removePhoto}
                          disabled={uploading}
                        >
                          {uploading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground text-center mt-2">
                    JPEG, PNG, or GIF (Max 5MB)
                  </p>
                  {user.id && (
                    <p className="text-xs text-muted-foreground text-center">
                      User ID: {user.id}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 shadow-card">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={user.name} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={user.email} disabled />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={user.phone || 'Not provided'} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input value={user.role.charAt(0).toUpperCase() + user.role.slice(1)} disabled />
                </div>
                {user.id && (
                  <div className="space-y-2">
                    <Label>User ID</Label>
                    <Input value={user.id.toString()} disabled />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;