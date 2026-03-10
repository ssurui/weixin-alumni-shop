<template>
  <view class="notifications-page">
    <!-- 顶部操作栏 -->
    <view v-if="unreadCount > 0" class="top-bar">
      <view class="spacer" />
      <view class="mark-all-btn" @tap="handleMarkAllRead">
        <van-icon name="checked" size="28rpx" color="#1989fa" />
        <text class="mark-all-text">一键已读</text>
      </view>
    </view>

    <!-- 加载中 -->
    <van-loading v-if="loading && groupedList.length === 0" class="page-loading" size="64rpx" vertical>
      加载中...
    </van-loading>

    <!-- 空状态 -->
    <van-empty
      v-else-if="!loading && groupedList.length === 0"
      description="暂无消息通知"
      class="empty-state"
    />

    <!-- 分组通知列表 -->
    <view v-else class="notification-groups">
      <view v-for="group in groupedList" :key="group.date" class="date-group">
        <!-- 日期分隔标签 -->
        <view class="date-label">
          <text>{{ formatGroupDate(group.date) }}</text>
        </view>

        <!-- 该日期下的通知条目 -->
        <view
          v-for="item in group.items"
          :key="item.id"
          class="notification-item"
          :class="{ unread: !item.isRead }"
          @tap="handleItemTap(item)"
        >
          <!-- 类型图标 -->
          <view class="type-icon" :class="`type-icon--${item.type}`">
            <van-icon :name="typeIconMap[item.type] || 'bell'" size="36rpx" :color="typeColorMap[item.type] || '#999'" />
          </view>

          <!-- 内容区 -->
          <view class="item-content">
            <view class="item-title-row">
              <text class="item-title" :class="{ 'item-title--bold': !item.isRead }">
                {{ item.title }}
              </text>
              <view v-if="!item.isRead" class="unread-dot" />
            </view>

            <!-- 折叠/展开内容 -->
            <text
              class="item-body"
              :class="{ expanded: expandedIds.has(item.id) }"
            >
              {{ item.content }}
            </text>

            <!-- 时间 -->
            <text class="item-time">{{ formatRelativeTime(item.createdAt) }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Taro from '@tarojs/taro'
import { getNotifications, markRead, markAllRead } from '../../api/notifications'
import type { Notification } from '../../api/notifications'
import dayjs from 'dayjs'

// ---- 类型图标映射 ----
const typeIconMap: Record<string, string> = {
  order: 'orders-o',
  payment: 'balance-o',
  alumni: 'certificate',
  system: 'setting-o',
}

// ---- 类型颜色映射 ----
const typeColorMap: Record<string, string> = {
  order: '#1989fa',
  payment: '#07c160',
  alumni: '#ff976a',
  system: '#7232dd',
}

// ---- 状态 ----
const loading = ref(false)
const notificationList = ref<Notification[]>([])
const total = ref(0)
const unreadCount = ref(0)
// 已展开的通知 ID 集合
const expandedIds = ref<Set<string>>(new Set())

// ---- 按日期分组的列表 ----
interface DateGroup {
  date: string
  items: Notification[]
}

const groupedList = computed<DateGroup[]>(() => {
  const map = new Map<string, Notification[]>()
  for (const item of notificationList.value) {
    const dateKey = dayjs(item.createdAt).format('YYYY-MM-DD')
    if (!map.has(dateKey)) map.set(dateKey, [])
    map.get(dateKey)!.push(item)
  }
  // 按日期降序排列
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({ date, items }))
})

// ---- 初始化 ----
onMounted(() => {
  fetchNotifications()
})

// ---- 获取通知列表 ----
async function fetchNotifications() {
  loading.value = true
  try {
    // 拉取足够多的条目（前端分组展示）
    const res = await getNotifications(1, 50)
    notificationList.value = res.list || []
    total.value = res.total || 0
    // 统计未读数
    unreadCount.value = notificationList.value.filter((n) => !n.isRead).length
  } catch (e: any) {
    Taro.showToast({ title: e?.message || '获取通知失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// ---- 点击通知条目 ----
async function handleItemTap(item: Notification) {
  // 展开/折叠内容
  if (expandedIds.value.has(item.id)) {
    expandedIds.value.delete(item.id)
  } else {
    expandedIds.value.add(item.id)
  }

  // 若未读，标记为已读
  if (!item.isRead) {
    try {
      await markRead(item.id)
      item.isRead = true
      // 更新未读数
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch {
      // 标记失败静默处理
    }
  }
}

// ---- 一键已读 ----
async function handleMarkAllRead() {
  try {
    await markAllRead()
    notificationList.value.forEach((n) => { n.isRead = true })
    unreadCount.value = 0
    Taro.showToast({ title: '已全部标记为已读', icon: 'success' })
  } catch (e: any) {
    Taro.showToast({ title: e?.message || '操作失败', icon: 'none' })
  }
}

// ---- 格式化分组日期标签 ----
function formatGroupDate(dateStr: string): string {
  const today = dayjs().format('YYYY-MM-DD')
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
  if (dateStr === today) return '今天'
  if (dateStr === yesterday) return '昨天'
  return dateStr
}

// ---- 格式化相对时间 ----
function formatRelativeTime(dateStr: string): string {
  const now = dayjs()
  const target = dayjs(dateStr)
  const diffMins = now.diff(target, 'minute')
  const diffHours = now.diff(target, 'hour')
  const diffDays = now.diff(target, 'day')

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  return target.format('YYYY-MM-DD')
}
</script>

<style lang="scss">
.notifications-page {
  background: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 40rpx;
}

/* 顶部操作栏 */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 16rpx 32rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;

  .spacer { flex: 1; }

  .mark-all-btn {
    display: flex;
    align-items: center;
    gap: 8rpx;
    padding: 8rpx 16rpx;

    .mark-all-text {
      font-size: 26rpx;
      color: #1989fa;
    }
  }
}

/* 加载居中 */
.page-loading {
  display: flex;
  justify-content: center;
  padding: 120rpx 0;
}

/* 空状态 */
.empty-state {
  padding-top: 120rpx;
}

/* 分组列表 */
.notification-groups {
  padding: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* 日期分组 */
.date-group {
  margin-bottom: 16rpx;
}

.date-label {
  padding: 12rpx 8rpx;
  text {
    font-size: 24rpx;
    color: #999;
    font-weight: 500;
  }
}

/* 通知条目 */
.notification-item {
  display: flex;
  gap: 20rpx;
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  transition: background 0.2s;

  &.unread {
    background: #f8fbff;
  }
}

/* 类型图标 */
.type-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &--order { background: #e8f3ff; }
  &--payment { background: #e8f9ef; }
  &--alumni { background: #fff3eb; }
  &--system { background: #f4eeff; }
}

/* 内容区 */
.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}

.item-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;

  .item-title {
    font-size: 28rpx;
    color: #666;
    flex: 1;

    &--bold {
      color: #333;
      font-weight: bold;
    }
  }

  .unread-dot {
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    background: #ee0a24;
    flex-shrink: 0;
  }
}

.item-body {
  font-size: 26rpx;
  color: #999;
  line-height: 1.5;
  /* 默认折叠为2行 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;

  &.expanded {
    /* 展开后显示全部 */
    display: block;
    overflow: visible;
  }
}

.item-time {
  font-size: 22rpx;
  color: #c8c9cc;
}
</style>
