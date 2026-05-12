export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  email: string;
  userName: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  userName: string;
}
