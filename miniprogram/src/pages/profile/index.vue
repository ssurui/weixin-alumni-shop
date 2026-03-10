<template>
  <view class="profile-page">
    <!-- 用户头部区域 -->
    <view class="user-header">
      <!-- 未登录状态 -->
      <view v-if="!userStore.isLoggedIn" class="user-header__content">
        <view class="avatar-placeholder">
          <van-icon name="contact" size="80rpx" color="#fff" />
        </view>
        <view class="user-info">
          <text class="username-placeholder">未登录</text>
          <text class="login-tip">点击登录，享受更多功能</text>
        </view>
        <van-button
          class="login-btn"
          type="primary"
          size="small"
          round
          @click="handleLogin"
        >
          立即登录
        </van-button>
      </view>

      <!-- 已登录状态 -->
      <view v-else class="user-header__content">
        <!-- 头像：以 openid 前8位为占位文字 -->
        <view class="avatar-circle">
          <text class="avatar-text">
            {{ (userStore.userInfo?.openid || userStore.userInfo?.id || '用户').slice(0, 2).toUpperCase() }}
          </text>
        </view>
        <view class="user-info">
          <text class="nickname">{{ userStore.userInfo?.nickname || '校友' }}</text>
          <!-- 校友认证状态徽章 -->
          <view class="alumni-badge" :class="alumniBadgeClass">
            <van-icon :name="alumniBadgeIcon" size="22rpx" />
            <text class="alumni-badge__text">{{ alumniBadgeText }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 功能菜单列表 -->
    <view class="menu-section">
      <van-cell-group inset>
        <!-- 我的订单 -->
        <van-cell
          title="我的订单"
          is-link
          center
          @click="navigateTo('/pages/order/list/index')"
        >
          <template #icon>
            <van-icon name="orders-o" size="40rpx" color="#1989fa" class="cell-icon" />
          </template>
        </van-cell>

        <!-- 收货地址 -->
        <van-cell
          title="收货地址"
          is-link
          center
          @click="navigateTo('/pages/address/list/index')"
        >
          <template #icon>
            <van-icon name="location-o" size="40rpx" color="#1989fa" class="cell-icon" />
          </template>
        </van-cell>

        <!-- 我的评价 -->
        <van-cell
          title="我的评价"
          is-link
          center
          @click="navigateTo('/pages/reviews/index')"
        >
          <template #icon>
            <van-icon name="comment-o" size="40rpx" color="#1989fa" class="cell-icon" />
          </template>
        </van-cell>

        <!-- 售后申请 -->
        <van-cell
          title="售后申请"
          is-link
          center
          @click="navigateTo('/pages/after-sales/apply/index')"
        >
          <template #icon>
            <van-icon name="service-o" size="40rpx" color="#1989fa" class="cell-icon" />
          </template>
        </van-cell>

        <!-- 消息通知（带未读数角标） -->
        <van-cell
          title="消息通知"
          is-link
          center
          @click="navigateTo('/pages/notifications/index')"
        >
          <template #icon>
            <view class="cell-icon-wrap">
              <van-icon name="bell" size="40rpx" color="#1989fa" />
              <!-- 未读角标 -->
              <view v-if="unreadCount > 0" class="unread-badge">
                <text>{{ unreadCount > 99 ? '99+' : unreadCount }}</text>
              </view>
            </view>
          </template>
        </van-cell>

        <!-- 校友认证（仅未通过时显示） -->
        <van-cell
          v-if="showAlumniVerifyEntry"
          title="校友认证"
          is-link
          center
          @click="navigateTo('/pages/profile/alumni-verify/index')"
        >
          <template #icon>
            <van-icon name="certificate" size="40rpx" color="#ff976a" class="cell-icon" />
          </template>
        </van-cell>
      </van-cell-group>
    </view>

    <!-- 退出登录按钮（仅登录时显示） -->
    <view v-if="userStore.isLoggedIn" class="logout-section">
      <van-button
        class="logout-btn"
        plain
        type="danger"
        block
        round
        @click="handleLogout"
      >
        退出登录
      </van-button>
    </view>

    <!-- 底部安全距离 -->
    <view class="safe-bottom" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Taro from '@tarojs/taro'
import { useUserStore } from '@/stores/user'
import { getUnreadCount } from '@/api/notifications'

const userStore = useUserStore()

// 未读消息数量
const unreadCount = ref(0)

// 校友认证状态对应的样式类
const alumniBadgeClass = computed(() => {
  const status = userStore.alumniStatus?.status
  if (status === 'approved') return 'alumni-badge--approved'
  if (status === 'pending') return 'alumni-badge--pending'
  if (status === 'rejected') return 'alumni-badge--rejected'
  return 'alumni-badge--unverified'
})

// 校友认证状态图标
const alumniBadgeIcon = computed(() => {
  const status = userStore.alumniStatus?.status
  if (status === 'approved') return 'passed'
  if (status === 'pending') return 'clock-o'
  if (status === 'rejected') return 'close'
  return 'question-o'
})

// 校友认证状态文字
const alumniBadgeText = computed(() => {
  const status = userStore.alumniStatus?.status
  if (status === 'approved') return '已认证'
  if (status === 'pending') return '审核中'
  if (status === 'rejected') return '已拒绝'
  return '未认证'
})

// 是否显示校友认证入口（未通过时显示）
const showAlumniVerifyEntry = computed(() => {
  const status = userStore.alumniStatus?.status
  return status !== 'approved'
})

onMounted(async () => {
  // 恢复登录状态
  userStore.restoreFromStorage()

  if (userStore.isLoggedIn) {
    // 获取校友认证状态
    await userStore.fetchAlumniStatus()
    // 获取未读消息数量
    await fetchUnreadCount()
  }
})

// 获取未读消息数量
async function fetchUnreadCount() {
  try {
    const result = await getUnreadCount()
    unreadCount.value = result.count
  } catch {
    // 忽略错误
  }
}

// 跳转到指定页面
function navigateTo(url: string) {
  if (!userStore.isLoggedIn) {
    Taro.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  Taro.navigateTo({ url })
}

// 登录
async function handleLogin() {
  try {
    await userStore.login()
    Taro.showToast({ title: '登录成功', icon: 'success' })
    // 登录后获取相关数据
    await userStore.fetchAlumniStatus()
    await fetchUnreadCount()
  } catch {
    Taro.showToast({ title: '登录失败，请重试', icon: 'none' })
  }
}

// 退出登录
function handleLogout() {
  Taro.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        unreadCount.value = 0
        Taro.switchTab({ url: '/pages/index/index' })
      }
    },
  })
}
</script>

<style lang="scss">
.profile-page {
  min-height: 100vh;
  background: #f5f5f5;
}

/* 用户头部区域 */
.user-header {
  background: linear-gradient(135deg, #1989fa 0%, #07c160 100%);
  padding: 60rpx 32rpx 48rpx;

  &__content {
    display: flex;
    align-items: center;
    gap: 24rpx;
  }
}

/* 未登录头像占位 */
.avatar-placeholder {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 已登录头像圆形 */
.avatar-circle {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  border: 4rpx solid rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .avatar-text {
    color: #fff;
    font-size: 40rpx;
    font-weight: bold;
  }
}

/* 用户信息区域 */
.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;

  .nickname {
    color: #fff;
    font-size: 36rpx;
    font-weight: bold;
  }

  .username-placeholder {
    color: #fff;
    font-size: 36rpx;
    font-weight: bold;
  }

  .login-tip {
    color: rgba(255, 255, 255, 0.8);
    font-size: 24rpx;
  }
}

/* 登录按钮 */
.login-btn {
  flex-shrink: 0;
}

/* 校友认证状态徽章 */
.alumni-badge {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 16rpx;
  border-radius: 24rpx;
  font-size: 22rpx;

  &__text {
    font-size: 22rpx;
  }

  /* 未认证 - 灰色 */
  &--unverified {
    background: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.8);
  }

  /* 审核中 - 橙色 */
  &--pending {
    background: rgba(255, 151, 106, 0.3);
    color: #ffe58f;
  }

  /* 已认证 - 绿色 */
  &--approved {
    background: rgba(7, 193, 96, 0.3);
    color: #b7eb8f;
  }

  /* 已拒绝 - 红色 */
  &--rejected {
    background: rgba(238, 10, 36, 0.3);
    color: #ffa39e;
  }
}

/* 功能菜单区域 */
.menu-section {
  margin-top: 24rpx;
}

/* 菜单图标 */
.cell-icon {
  margin-right: 16rpx;
}

/* 带角标的图标容器 */
.cell-icon-wrap {
  position: relative;
  margin-right: 16rpx;
  display: flex;
  align-items: center;
}

/* 未读数角标 */
.unread-badge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  min-width: 32rpx;
  height: 32rpx;
  background: #ee0a24;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6rpx;

  text {
    color: #fff;
    font-size: 18rpx;
    line-height: 1;
  }
}

/* 退出登录区域 */
.logout-section {
  margin: 48rpx 32rpx 24rpx;
}

/* 底部安全距离 */
.safe-bottom {
  height: env(safe-area-inset-bottom);
  padding-bottom: 40rpx;
}
</style>
