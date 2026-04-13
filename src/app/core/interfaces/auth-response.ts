import { UserData } from './user-data';

export interface AuthResponse {
  message: string;
  user: UserData;
  token: string;
}
