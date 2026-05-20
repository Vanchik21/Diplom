export type ClassroomRole = 1 | 2 | 3; // 1 = Teacher, 2 = Student, 3 = CoAuthor

export interface ClassroomSummaryDto {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  inviteCode: string;
  isArchived: boolean;
  createdAt: string;
  myRole: ClassroomRole;
  memberCount: number;
}

export interface ClassroomDetailDto {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  inviteCode: string;
  isArchived: boolean;
  createdAt: string;
  myRole: ClassroomRole;
  members: ClassroomMemberDto[];
}

export interface ClassroomMemberDto {
  userId: string;
  userName: string;
  displayName: string;
  role: ClassroomRole;
  joinedAt: string;
}

export interface ClassroomCreateDto {
  name: string;
  description?: string;
}

export interface ClassroomUpdateDto {
  name: string;
  description?: string;
  isArchived: boolean;
}

export interface JoinClassroomDto {
  inviteCode: string;
}
