import { CartProduct } from '../cart-product/cart-product';

export interface CartDetails {
  _id: string;
  cartOwner: string;
  products: CartProduct[];
  __v: number;
  totalCartPrice?: number;
  createdAt: string;
  updatedAt: string;
}
