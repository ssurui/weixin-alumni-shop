import { get, post } from './request'

export interface Notification {
  id: string
  type: string
  title: string
  content?: string
  extraData?: any
  isRead: boolean
  readAt?: string
  createdAt: string
}

// 获取通知列表（REQ-073）
export const getNotifications = (page = 1, pageSize = 20) =>
  get<{ list: Notification[]; total: number }>(`/notifications?page=${page}&pageSize=${pageSize}`)

// 标记已读（REQ-074）
export const markRead = (id: string) => post(`/notifications/${id}/read`)

// 全部标记已读（REQ-075）
export const markAllRead = () => post('/notifications/read-all')

// 未读数量（REQ-076）
export const getUnreadCount = () => get<{ count: number }>('/notifications/unread-count')
