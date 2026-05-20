export interface RoleRequestDto {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  requestedRole: 'Student' | 'Teacher';
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}
