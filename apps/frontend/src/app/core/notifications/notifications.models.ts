export interface NotificationDto {
  id: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}
