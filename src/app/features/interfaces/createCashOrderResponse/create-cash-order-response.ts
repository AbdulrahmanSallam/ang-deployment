import { CartProduct } from '../cart-product/cart-product';

export interface CreateCashOrderResponse {
  status: string;
  data: Data;
}

export interface Data {
  taxPrice: number;
  shippingPrice: number;
  totalOrderPrice: number;
  paymentMethodType: string;
  isPaid: boolean;
  isDelivered: boolean;
  _id: string;
  user: string;
  cartItems: CartProduct[];
  createdAt: string;
  updatedAt: string;
  id: number;
  __v: number;
}
