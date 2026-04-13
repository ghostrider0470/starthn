import api from './api';
import type { SocialLinks } from './author.service';

interface ProfileData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  isActive: boolean;
  isOptedOut: boolean;
  roles: string[];
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  avatarUrl?: string;
  bio?: string;
  profession?: string;
  expertise?: string[];
  socialLinks?: SocialLinks;
  slug?: string;
  pageContent?: string;
}

interface UpdateProfileDto {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  bio?: string;
  profession?: string;
  expertise?: string[];
  socialLinks?: SocialLinks;
  slug?: string;
  pageContent?: string;
}

interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

class ProfileService {
  async getProfile(): Promise<ProfileData> {
    const response = await api.get('/user/profile');
    const data = response.data;
    
    if (!data) {
      throw new Error('No profile data received');
    }
    
    // Map the backend response to our frontend format
    return {
      id: data.id,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
      isActive: data.isActive,
      isOptedOut: data.isOptedOut,
      roles: data.roles,
      emailNotifications: data.emailNotifications ?? true,
      smsNotifications: data.smsNotifications ?? false,
      avatarUrl: data.avatarUrl,
      bio: data.bio,
      profession: data.profession,
      expertise: data.expertise,
      socialLinks: data.socialLinks,
      slug: data.slug,
      pageContent: data.pageContent,
    };
  }

  async updateProfile(data: UpdateProfileDto): Promise<void> {
    await api.put('/user/profile', data);
  }

  async changePassword(data: ChangePasswordDto): Promise<void> {
    await api.post('/user/change-password', data);
  }

  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/user/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  }

  async removeAvatar(): Promise<void> {
    await api.delete('/user/avatar');
  }
}

export default new ProfileService();