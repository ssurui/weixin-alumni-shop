import Taro from '@tarojs/taro'
import { useUserStore } from '../stores/user'

const BASE_URL = process.env.TARO_APP_API_URL || 'https://api.example.com/api/v1'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  needAuth?: boolean
}

interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
  timestamp: number
}

export async function request<T = any>(options: RequestOptions): Promise<T> {
  const { url, method = 'GET', data, needAuth = true } = options

  const header: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (needAuth) {
    const token = Taro.getStorageSync('accessToken')
    if (token) {
      header['Authorization'] = `Bearer ${token}`
    }
  }

  try {
    const res = await Taro.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header,
    })

    const body = res.data as ApiResponse<T>

    if (body.code !== 0) {
      // Token 过期，跳转登录
      if (body.code === 10002) {
        Taro.removeStorageSync('accessToken')
        Taro.reLaunch({ url: '/pages/index/index' })
      }
      throw new Error(body.message || '请求失败')
    }

    return body.data
  } catch (error: any) {
    Taro.showToast({
      title: error.message || '网络请求失败',
      icon: 'none',
      duration: 2000,
    })
    throw error
  }
}

export const get = <T>(url: string, data?: any, needAuth = true) =>
  request<T>({ url, method: 'GET', data, needAuth })

export const post = <T>(url: string, data?: any, needAuth = true) =>
  request<T>({ url, method: 'POST', data, needAuth })

export const put = <T>(url: string, data?: any, needAuth = true) =>
  request<T>({ url, method: 'PUT', data, needAuth })

export const del = <T>(url: string, needAuth = true) =>
  request<T>({ url, method: 'DELETE', needAuth })
