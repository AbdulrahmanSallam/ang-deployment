import { CartDetails } from "../cart-details/cart-details";


export interface CartInfo {
  status?: string;
  message?: string;
  numOfCartItems: number;
  cartId: string;
  data: CartDetails;
}

