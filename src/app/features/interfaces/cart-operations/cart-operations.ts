import { CartDetails } from '../cart-details/cart-details';

export interface CartOperations {
  status?: string;
  message?: string;
  numOfCartItems: number;
  cartId: string;
  data: CartDetails;
}
