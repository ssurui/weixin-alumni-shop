<template>
  <view class="cart-page">
    <!-- 未登录 -->
    <view v-if="!userStore.isLoggedIn" class="empty-wrap">
      <van-empty description="请先登录查看购物车" image="error">
        <van-button type="primary" @tap="goLogin">去登录</van-button>
      </van-empty>
    </view>

    <!-- 空购物车 -->
    <view v-else-if="!cartStore.items.length" class="empty-wrap">
      <van-empty description="购物车还是空的">
        <van-button type="primary" @tap="goShopping">去选购</van-button>
      </van-empty>
    </view>

    <!-- 购物车列表 -->
    <template v-else>
      <view class="cart-list">
        <view v-for="item in cartStore.items" :key="item.id" class="cart-item card">
          <!-- 选择框 -->
          <van-checkbox
            :value="cartStore.selectedItems.has(item.id)"
            @change="cartStore.toggleSelect(item.id)"
          />

          <!-- 商品图片 -->
          <image
            class="item-img"
            :src="item.sku.imageUrl || item.product.coverImage || '/assets/placeholder.png'"
            mode="aspectFill"
            @tap="goProduct(item.productId)"
          />

          <!-- 商品信息 -->
          <view class="item-info">
            <text class="item-name" @tap="goProduct(item.productId)">{{ item.product.name }}</text>
            <text class="item-spec">{{ formatSpec(item.sku.specValues) }}</text>
            <text v-if="item.customizationText" class="item-custom">
              刻字：{{ item.customizationText }}
            </text>
            <view class="item-bottom">
              <text class="item-price">¥{{ parseFloat(item.sku.price).toFixed(2) }}</text>
              <van-stepper
                :value="item.quantity"
                :min="1"
                :max="item.sku.stock"
                @change="(val) => updateQuantity(item.id, val)"
              />
            </view>
          </view>

          <!-- 删除 -->
          <van-icon
            name="delete-o"
            size="40rpx"
            color="#ccc"
            @tap="removeItem(item.id)"
          />
        </view>
      </view>

      <!-- 底部结算栏 -->
      <view class="bottom-bar">
        <van-checkbox
          :value="isAllSelected"
          @change="cartStore.toggleSelectAll(!isAllSelected)"
        >全选</van-checkbox>

        <view class="total-wrap">
          <text class="total-label">合计：</text>
          <text class="total-price">¥{{ cartStore.selectedAmount }}</text>
        </view>

        <van-button
          type="primary"
          :disabled="!cartStore.selectedItems.size"
          @tap="checkout"
        >结算({{ cartStore.selectedItems.size }})</van-button>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import Taro from '@tarojs/taro'
import { useCartStore } from '../../stores/cart'
import { useUserStore } from '../../stores/user'

const cartStore = useCartStore()
const userStore = useUserStore()

const isAllSelected = computed(
  () => cartStore.items.length > 0 && cartStore.selectedItems.size === cartStore.items.length,
)

onMounted(() => {
  userStore.restoreFromStorage()
  if (userStore.isLoggedIn) cartStore.fetchCart()
})

function goLogin() {
  Taro.navigateTo({ url: '/pages/index/index' })
}

function goShopping() {
  Taro.switchTab({ url: '/pages/product/list/index' })
}

function goProduct(id: string) {
  Taro.navigateTo({ url: `/pages/product/detail/index?id=${id}` })
}

function formatSpec(specValues?: Record<string, string>): string {
  if (!specValues) return ''
  return Object.values(specValues).join(' / ')
}

async function updateQuantity(id: string, val: number) {
  await cartStore.updateItem(id, val)
}

function removeItem(id: string) {
  Taro.showModal({
    title: '确认删除',
    content: '确认从购物车移除该商品？',
    success: async ({ confirm }) => {
      if (confirm) await cartStore.removeItem(id)
    },
  })
}

function checkout() {
  if (!userStore.isVerified) {
    Taro.showModal({
      title: '需要校友认证',
      content: '购买前请先完成校友身份认证',
      confirmText: '去认证',
      success: ({ confirm }) => {
        if (confirm) Taro.navigateTo({ url: '/pages/profile/alumni-verify/index' })
      },
    })
    return
  }

  // 获取选中的商品ID跳转到创建订单页
  const selectedIds = Array.from(cartStore.selectedItems).join(',')
  Taro.navigateTo({ url: `/pages/order/create/index?cartItemIds=${selectedIds}` })
}
</script>

<style lang="scss">
.cart-page {
  background: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 140rpx;
}

.empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
}

.cart-list {
  padding: 16rpx;

  .cart-item {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin-bottom: 16rpx;
    background: #fff;
    border-radius: 12rpx;
    padding: 20rpx;

    .item-img {
      width: 160rpx;
      height: 160rpx;
      border-radius: 8rpx;
      flex-shrink: 0;
    }

    .item-info {
      flex: 1;
      min-width: 0;

      .item-name {
        font-size: 28rpx;
        color: #333;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
        margin-bottom: 8rpx;
      }

      .item-spec {
        font-size: 24rpx;
        color: #999;
        margin-bottom: 4rpx;
      }

      .item-custom {
        font-size: 22rpx;
        color: #1989fa;
        margin-bottom: 8rpx;
        display: block;
      }

      .item-bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .item-price {
          color: #ee0a24;
          font-size: 32rpx;
          font-weight: bold;
        }
      }
    }
  }
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 16rpx 24rpx calc(env(safe-area-inset-bottom) + 16rpx);
  display: flex;
  align-items: center;
  gap: 16rpx;
  box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.08);

  .total-wrap {
    flex: 1;
    display: flex;
    align-items: baseline;

    .total-label { font-size: 26rpx; color: #666; }
    .total-price { color: #ee0a24; font-size: 36rpx; font-weight: bold; }
  }
}
</style>
