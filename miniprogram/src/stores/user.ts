import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import Taro from '@tarojs/taro'
import { wxLogin, getAlumniStatus } from '../api/auth'
import type { AlumniStatus } from '../api/auth'

export const useUserStore = defineStore('user', () => {
  const accessToken = ref<string>(Taro.getStorageSync('accessToken') || '')
  const userInfo = ref<any>(null)
  const alumniStatus = ref<AlumniStatus | null>(null)

  const isLoggedIn = computed(() => !!accessToken.value)
  const isVerified = computed(() => userInfo.value?.isVerified === true)
  const isOverseas = computed(() => userInfo.value?.isOverseas === true)

  // 微信登录（REQ-001）
  async function login() {
    try {
      const { code } = await Taro.login()

      // 获取用户头像昵称（新版微信需用户主动授权）
      let nickname: string | undefined
      let avatarUrl: string | undefined

      const result = await wxLogin(code, nickname, avatarUrl)

      accessToken.value = result.accessToken
      userInfo.value = result.user
      Taro.setStorageSync('accessToken', result.accessToken)
      Taro.setStorageSync('userInfo', result.user)

      return result
    } catch (error) {
      throw error
    }
  }

  // 退出登录
  function logout() {
    accessToken.value = ''
    userInfo.value = null
    alumniStatus.value = null
    Taro.removeStorageSync('accessToken')
    Taro.removeStorageSync('userInfo')
  }

  // 从本地恢复登录状态
  function restoreFromStorage() {
    const token = Taro.getStorageSync('accessToken')
    const info = Taro.getStorageSync('userInfo')
    if (token && info) {
      accessToken.value = token
      userInfo.value = info
    }
  }

  // 获取校友认证状态
  async function fetchAlumniStatus() {
    if (!isLoggedIn.value) return
    try {
      alumniStatus.value = await getAlumniStatus()
    } catch {
      // 忽略错误
    }
  }

  return {
    accessToken,
    userInfo,
    alumniStatus,
    isLoggedIn,
    isVerified,
    isOverseas,
    login,
    logout,
    restoreFromStorage,
    fetchAlumniStatus,
  }
})
