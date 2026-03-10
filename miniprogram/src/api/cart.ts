import { get, post, put, del } from './request'

export interface CartItem {
  id: string
  cartId: string
  productId: string
  skuId: string
  quantity: number
  customizationText?: string
  selectedFont?: string
  product: {
    id: string
    name: string
    coverImage?: string
    status: string
  }
  sku: {
    id: string
    price: string
    stock: number
    specValues?: Record<string, string>
    imageUrl?: string
  }
}

export interface Cart {
  id: string
  items: CartItem[]
}

// 获取购物车（REQ-026）
export const getCart = () => get<Cart>('/cart')

// 加入购物车（REQ-027）
export const addToCart = (data: {
  skuId: number
  quantity: number
  customizationText?: string
  selectedFont?: string
}) => post('/cart/items', data)

// 更新数量（REQ-028）
export const updateCartItem = (id: string, quantity: number) =>
  put(`/cart/items/${id}`, { quantity })

// 删除购物车商品（REQ-029）
export const removeCartItem = (id: string) => del(`/cart/items/${id}`)

// 清空购物车（REQ-030）
export const clearCart = () => del('/cart')
