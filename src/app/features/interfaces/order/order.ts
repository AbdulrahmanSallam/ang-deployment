import { CartProduct } from '../cart-product/cart-product';

export interface Order {
  taxPrice: number;
  shippingPrice: number;
  totalOrderPrice: number;
  paymentMethodType: string;
  isPaid: boolean;
  isDelivered: boolean;
  _id: string;
  user: User;
  cartItems: CartProduct[];
  createdAt: string;
  updatedAt: string;
  id: number;
  __v: number;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
}
