export interface UserProfile {
  id: string;
  email: string;
  userName: string;
  firstName: string;
  lastName: string;
  university: string;
  avatarUrl: string | null;
  faculty: string | null;
  studyYear: number | null;
  bio: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  university: string;
  faculty?: string | null;
  studyYear?: number | null;
  bio?: string | null;
}
