import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/services/apiClient';
import { useToast } from '@/components/atoms/Toast';

export interface ProfileData {
  id: number;
  phoneNumber: string;
  countryCode: string;
  email?: string;
  name?: string;
  profilePicture?: string;
  role: string;
  isVerified: boolean;
  isActive: boolean;
  loginCount: number;
  lastLoginAt: string;
  profile?: {
    bio?: string;
    dateOfBirth?: string;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    city?: string;
    state?: string;
    country?: string;
    language?: string;
    timezone?: string;
    zodiacSign?: string;
    rashi?: string;
    zodiac?: {
      western: {
        en: string | null;
        hi: string | null;
      };
      vedic: {
        hi: string | null;
        en: string | null;
      };
    };
  };
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  profilePicture?: string;
  bio?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  city?: string;
  state?: string;
  country?: string;
  language?: string;
  timezone?: string;
}

export interface ZodiacInfo {
  sign: string;
  rashi: string;
}

export function useProfile() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Get user profile
  const profileQuery = useQuery<ProfileData>({
    queryKey: ['profile'],
    queryFn: async () => {
      console.log('🔧 Profile Hook: Fetching profile data');
      try {
        const response = await apiClient.get<{ success: boolean; data: ProfileData }>('/v1/profile');

        console.log('📦 Profile API Response:', {
          success: response.success,
          hasProfile: !!response.data.profile,
          zodiacSign: response.data.profile?.zodiacSign,
          rashi: response.data.profile?.rashi
        });

        return response.data;
      } catch (error) {
        console.error('❌ Profile API Error:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileRequest) => {
      console.log('🚀 Profile Update: Sending data', data);
      try {
        const response = await apiClient.put<{ success: boolean; data: ProfileData }>('/v1/profile', data);

        console.log('📦 Profile Update Response:', {
          success: response.success,
          updatedZodiac: response.data.profile?.zodiacSign,
          updatedRashi: response.data.profile?.rashi
        });

        return response.data;
      } catch (error) {
        console.error('❌ Profile Update Error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Update the query cache
      queryClient.setQueryData(['profile'], data);

      showToast({
        type: 'success',
        message: 'Profile updated successfully',
        duration: 2000
      });
    },
    onError: (error: any) => {
      console.error('❌ Profile Update Error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        response: error.response?.data
      });

      let errorMessage = 'Failed to update profile';

      if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network connection failed. Please check your internet connection.';
      } else if (error.statusCode === 401) {
        errorMessage = 'Please log in again to update your profile.';
      } else if (error.statusCode === 502) {
        errorMessage = 'Server error. Please try again in a moment.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      showToast({
        type: 'error',
        title: 'Update Failed',
        message: errorMessage
      });
    }
  });

  // Upload profile photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: { uri: string; type: string; name: string }) => {
      console.log('🚀 Photo Upload: Uploading file', { name: file.name, type: file.type });

      const formData = new FormData();
      formData.append('photo', {
        uri: file.uri,
        type: file.type,
        name: file.name,
      } as any);

      const response = await apiClient.post<{ success: boolean; data: { profilePicture: string } }>(
        '/v1/profile/photo',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('📦 Photo Upload Response:', response.data);
      return response.data;
    },
    onSuccess: (data) => {
      // Update profile picture in cache
      queryClient.setQueryData(['profile'], (oldData: ProfileData | undefined) => {
        if (oldData) {
          return {
            ...oldData,
            profilePicture: data.profilePicture
          };
        }
        return oldData;
      });

      showToast({
        type: 'success',
        message: 'Profile photo updated successfully',
        duration: 2000
      });
    },
    onError: (error: any) => {
      console.error('❌ Photo Upload Error:', error);

      let errorMessage = 'Failed to upload photo';

      if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network connection failed. Please check your internet connection.';
      } else if (error.statusCode === 401) {
        errorMessage = 'Please log in again to upload photos.';
      } else if (error.statusCode === 413) {
        errorMessage = 'Image file is too large. Please choose a smaller image.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      showToast({
        type: 'error',
        title: 'Upload Failed',
        message: errorMessage
      });
    }
  });

  // Delete profile photo mutation
  const deletePhotoMutation = useMutation({
    mutationFn: async () => {
      console.log('🗑️ Photo Delete: Removing profile photo');
      const response = await apiClient.delete<{ success: boolean; message: string }>('/v1/profile/photo');

      console.log('📦 Photo Delete Response:', response);
      return response;
    },
    onSuccess: () => {
      // Remove profile picture from cache
      queryClient.setQueryData(['profile'], (oldData: ProfileData | undefined) => {
        if (oldData) {
          return {
            ...oldData,
            profilePicture: undefined
          };
        }
        return oldData;
      });

      showToast({
        type: 'success',
        message: 'Profile photo removed successfully',
        duration: 2000
      });
    },
    onError: (error: any) => {
      console.error('❌ Photo Delete Error:', error);

      const errorMessage = error.response?.data?.message || 'Failed to delete photo';
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: errorMessage
      });
    }
  });

  // Get zodiac info for a specific date
  const getZodiacInfoMutation = useMutation({
    mutationFn: async (dateOfBirth: string) => {
      console.log('🔮 Zodiac Calculation: Getting zodiac for date', dateOfBirth);
      const response = await apiClient.post<{ success: boolean; data: ZodiacInfo }>('/v1/profile/zodiac', {
        dateOfBirth
      });

      console.log('📦 Zodiac Response:', response.data);
      return response.data;
    }
  });

  return {
    // Query data
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
    refetch: profileQuery.refetch,

    // Update profile
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,

    // Photo operations
    uploadPhoto: uploadPhotoMutation.mutateAsync,
    isUploadingPhoto: uploadPhotoMutation.isPending,
    deletePhoto: deletePhotoMutation.mutateAsync,
    isDeletingPhoto: deletePhotoMutation.isPending,

    // Zodiac calculation
    getZodiacInfo: getZodiacInfoMutation.mutateAsync,
    isCalculatingZodiac: getZodiacInfoMutation.isPending,
    zodiacResult: getZodiacInfoMutation.data,
  };
}