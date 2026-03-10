import { get, post } from './request'

export interface WxLoginResult {
  accessToken: string
  user: {
    id: string
    nickname: string
    avatarUrl: string
    isVerified: boolean
    isOverseas: boolean
  }
}

export interface AlumniStatus {
  status: 'not_applied' | 'pending' | 'approved' | 'rejected'
  id?: string
  reviewRemark?: string
  reviewedAt?: string
}

// 微信登录（REQ-001）
export const wxLogin = (code: string, nickname?: string, avatarUrl?: string) =>
  post<WxLoginResult>('/auth/wx-login', { code, nickname, avatarUrl }, false)

// 提交校友认证申请（REQ-005）
export const applyAlumni = (data: {
  realName: string
  studentId?: string
  graduationYear?: number
  major?: string
  proofImageUrl?: string
}) => post('/auth/alumni/apply', data)

// 查询校友认证状态（REQ-006）
export const getAlumniStatus = () => get<AlumniStatus>('/auth/alumni/status')

// 刷新 Token（REQ-004）
export const refreshToken = (refreshToken: string) =>
  post('/auth/refresh-token', { refreshToken }, false)
