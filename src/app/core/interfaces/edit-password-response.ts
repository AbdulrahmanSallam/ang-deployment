import { UserEditAccountResponse } from './edit-account-response';

export interface EditPasswordResponse {
  message: string;
  user: UserEditAccountResponse;
}
