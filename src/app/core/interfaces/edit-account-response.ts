export interface EditAccountResponse {
  message: string;
  user: UserEditAccountResponse;
}

export interface UserEditAccountResponse {
  name: string;
  email: string;
  role: string;
}
