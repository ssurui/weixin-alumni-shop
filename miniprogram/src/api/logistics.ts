import { get, post, put, del } from './request'

export interface Address {
  id: string
  receiverName: string
  phone: string
  country: string
  province?: string
  city?: string
  district?: string
  detail: string
  postalCode?: string
  isDefault: boolean
}

// 获取地址列表（REQ-049）
export const getAddresses = () => get<Address[]>('/logistics/addresses')

// 新增地址（REQ-050）
export const createAddress = (data: Omit<Address, 'id'>) =>
  post<Address>('/logistics/addresses', data)

// 更新地址（REQ-051）
export const updateAddress = (id: string, data: Partial<Address>) =>
  put<Address>(`/logistics/addresses/${id}`, data)

// 删除地址（REQ-052）
export const deleteAddress = (id: string) => del(`/logistics/addresses/${id}`)

// 设置默认地址（REQ-050）
export const setDefaultAddress = (id: string) =>
  put(`/logistics/addresses/${id}/default`, {})

// 物流追踪（REQ-053）
export const trackOrder = (orderId: string) =>
  get(`/logistics/orders/${orderId}/track`)
