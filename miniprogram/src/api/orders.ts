import { get, post } from './request'

export interface OrderItem {
  id: string
  productId: string
  skuId: string
  quantity: number
  unitPrice: string
  subtotal: string
  productSnapshot?: any
  skuSnapshot?: any
  customizationId?: string
  product?: { name: string; coverImage?: string }
  sku?: { specValues?: any }
}

export interface Order {
  id: string
  orderNo: string
  totalAmount: string
  currency: string
  exchangeRate?: string
  status: string
  paymentMethod?: string
  addressSnapshot?: any
  remark?: string
  cancelReason?: string
  expiresAt?: string
  createdAt: string
  items: OrderItem[]
  logistics?: any
  payments?: any[]
}

export interface CreateOrderData {
  addressId: number
  items: Array<{ skuId: number; quantity: number; customizationId?: number }>
  remark?: string
}

// 创建订单（REQ-031）
export const createOrder = (data: CreateOrderData) => post<Order>('/orders', data)

// 获取订单列表（REQ-032）
export const getOrders = (params?: { page?: number; pageSize?: number; status?: string }) =>
  get<{ list: Order[]; total: number; page: number; pageSize: number }>('/orders', params)

// 获取订单详情（REQ-033）
export const getOrder = (id: string) => get<Order>(`/orders/${id}`)

// 取消订单（REQ-034）
export const cancelOrder = (id: string) => post(`/orders/${id}/cancel`)

// 确认收货（REQ-035）
export const confirmReceived = (id: string) => post(`/orders/${id}/confirm`)
