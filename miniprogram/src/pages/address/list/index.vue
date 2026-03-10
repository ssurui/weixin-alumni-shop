<template>
  <view class="address-list-page">
    <!-- 加载中 -->
    <van-loading v-if="loading" class="loading" size="48rpx" vertical>加载中...</van-loading>

    <!-- 空状态 -->
    <van-empty
      v-else-if="!loading && addressList.length === 0"
      description="暂无收货地址"
      class="empty-state"
    />

    <!-- 地址列表 -->
    <view v-else class="address-list">
      <view
        v-for="addr in addressList"
        :key="addr.id"
        class="address-card"
        @tap="onSelectAddress(addr)"
      >
        <!-- 默认标签 + 姓名手机 -->
        <view class="address-header">
          <view class="receiver-info">
            <text class="receiver-name">{{ addr.receiverName }}</text>
            <text class="receiver-phone">{{ formatPhone(addr.phone) }}</text>
          </view>
          <van-tag v-if="addr.isDefault" type="primary" class="default-tag">默认</van-tag>
        </view>

        <!-- 完整地址 -->
        <view class="address-full">
          <text class="address-text">
            {{ [addr.province, addr.city, addr.district, addr.detail].filter(Boolean).join(' ') }}
          </text>
        </view>

        <!-- 操作按钮栏 -->
        <view class="address-actions" @tap.stop="">
          <!-- 设为默认（非默认地址才显示） -->
          <view
            v-if="!addr.isDefault"
            class="action-btn"
            @tap.stop="onSetDefault(addr.id)"
          >
            <van-icon name="circle" size="32rpx" />
            <text>设为默认</text>
          </view>
          <view v-else class="action-btn action-btn--default">
            <van-icon name="success" size="32rpx" />
            <text>默认地址</text>
          </view>

          <view class="action-right">
            <!-- 编辑 -->
            <view class="action-btn" @tap.stop="onEdit(addr.id)">
              <van-icon name="edit" size="32rpx" />
              <text>编辑</text>
            </view>
            <!-- 删除 -->
            <view class="action-btn action-btn--danger" @tap.stop="onDelete(addr.id)">
              <van-icon name="delete-o" size="32rpx" />
              <text>删除</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 新增收货地址按钮 -->
    <view class="add-btn-wrap">
      <van-button
        type="primary"
        block
        icon="plus"
        class="add-btn"
        @tap="onAddAddress"
      >
        新增收货地址
      </van-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Taro, { useRouter } from '@tarojs/taro'
import {
  getAddresses,
  deleteAddress,
  setDefaultAddress,
  type Address,
} from '../../../api/logistics'

// ---- 路由参数 ----
const router = useRouter()
// 若从订单创建页跳转过来，from=order
const fromOrder = router.params.from === 'order'

// ---- 状态 ----
const loading = ref(false)
const addressList = ref<Address[]>([])

// ---- 初始化 ----
onMounted(() => {
  fetchList()
})

// ---- 获取地址列表 ----
async function fetchList() {
  loading.value = true
  try {
    addressList.value = await getAddresses()
  } catch {
    Taro.showToast({ title: '获取地址失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// ---- 手机号脱敏（138****8888） ----
function formatPhone(phone: string): string {
  if (!phone || phone.length < 11) return phone
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

// ---- 点击地址（从订单页进入时选择地址） ----
function onSelectAddress(addr: Address) {
  if (!fromOrder) return
  // 将选中地址写入全局 EventChannel / 页面间通信
  const pages = Taro.getCurrentPages()
  if (pages.length >= 2) {
    const prevPage = pages[pages.length - 2] as any
    // 通过页面实例传递选中地址
    if (typeof prevPage.onAddressSelected === 'function') {
      prevPage.onAddressSelected(addr)
    }
  }
  Taro.navigateBack()
}

// ---- 跳转新增 ----
function onAddAddress() {
  const query = fromOrder ? '?from=order' : ''
  Taro.navigateTo({ url: `/pages/address/edit/index${query}` })
}

// ---- 跳转编辑 ----
function onEdit(id: string) {
  const query = fromOrder ? `?id=${id}&from=order` : `?id=${id}`
  Taro.navigateTo({ url: `/pages/address/edit/index${query}` })
}

// ---- 删除地址 ----
function onDelete(id: string) {
  Taro.showModal({
    title: '删除地址',
    content: '确认删除该收货地址？',
    success: async ({ confirm }) => {
      if (!confirm) return
      try {
        await deleteAddress(id)
        Taro.showToast({ title: '删除成功', icon: 'success' })
        fetchList()
      } catch {
        Taro.showToast({ title: '删除失败', icon: 'none' })
      }
    },
  })
}

// ---- 设为默认 ----
async function onSetDefault(id: string) {
  try {
    await setDefaultAddress(id)
    Taro.showToast({ title: '已设为默认地址', icon: 'success' })
    fetchList()
  } catch {
    Taro.showToast({ title: '操作失败', icon: 'none' })
  }
}
</script>

<style lang="scss">
.address-list-page {
  background: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 160rpx; /* 为底部按钮留空间 */
}

/* 加载居中 */
.loading {
  display: flex;
  justify-content: center;
  padding: 120rpx 0;
}

.empty-state {
  padding-top: 120rpx;
}

/* 地址列表 */
.address-list {
  padding: 16rpx 24rpx 0;
}

/* 单条地址卡片 */
.address-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 28rpx 24rpx 0;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);

  .address-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12rpx;

    .receiver-info {
      display: flex;
      align-items: center;
      gap: 16rpx;
    }

    .receiver-name {
      font-size: 30rpx;
      font-weight: bold;
      color: #333;
    }

    .receiver-phone {
      font-size: 28rpx;
      color: #666;
    }

    .default-tag {
      flex-shrink: 0;
    }
  }

  .address-full {
    margin-bottom: 20rpx;

    .address-text {
      font-size: 26rpx;
      color: #666;
      line-height: 1.6;
    }
  }

  /* 操作按钮区 */
  .address-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1rpx solid #f0f0f0;
    padding: 16rpx 0;

    .action-btn {
      display: flex;
      align-items: center;
      gap: 6rpx;
      font-size: 24rpx;
      color: #666;
      padding: 8rpx 12rpx;

      &--default {
        color: #1989fa;
      }

      &--danger {
        color: #ee0a24;
      }
    }

    .action-right {
      display: flex;
      align-items: center;
      gap: 8rpx;
    }
  }
}

/* 底部新增按钮 */
.add-btn-wrap {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 32rpx;
  background: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.08);

  .add-btn {
    border-radius: 48rpx;
  }
}
</style>
