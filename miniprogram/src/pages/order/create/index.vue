<template>
  <view class="create-order-page">
    <!-- 加载中 -->
    <van-loading v-if="initialLoading" class="page-loading" size="64rpx" vertical>
      加载中...
    </van-loading>

    <block v-else>
      <!-- 1. 收货地址区域 -->
      <view class="section-card address-section" @tap="goSelectAddress">
        <view v-if="selectedAddress" class="address-filled">
          <van-icon name="location-o" size="40rpx" color="#1989fa" class="address-icon" />
          <view class="address-detail">
            <view class="address-name-row">
              <text class="receiver-name">{{ selectedAddress.receiverName }}</text>
              <text class="receiver-phone">{{ selectedAddress.phone }}</text>
            </view>
            <text class="address-text">
              {{ formatAddressFull(selectedAddress) }}
            </text>
          </view>
          <van-icon name="arrow" size="32rpx" color="#c8c9cc" />
        </view>
        <view v-else class="address-empty">
          <van-icon name="location-o" size="40rpx" color="#c8c9cc" />
          <text class="address-placeholder">请选择收货地址</text>
          <van-icon name="arrow" size="32rpx" color="#c8c9cc" />
        </view>
      </view>

      <!-- 2. 商品明细 -->
      <view class="section-card items-section">
        <view class="section-title">商品明细</view>

        <view v-if="orderItems.length === 0" class="items-empty">
          <text class="items-empty-text">暂无选中商品</text>
        </view>

        <view v-for="item in orderItems" :key="item.id" class="order-item">
          <!-- 商品图片占位 -->
          <view class="item-img-placeholder">
            <image
              v-if="item.product?.coverImage"
              :src="item.product.coverImage"
              class="item-img"
              mode="aspectFill"
            />
            <van-icon v-else name="photo-o" size="48rpx" color="#c8c9cc" />
          </view>

          <!-- 商品信息 -->
          <view class="item-info">
            <text class="item-name">{{ item.product?.name || '商品' }}</text>
            <!-- SKU 规格 -->
            <text v-if="item.sku?.specValues" class="item-spec">
              {{ formatSpec(item.sku.specValues) }}
            </text>
            <!-- 定制刻字 -->
            <text v-if="item.customizationText" class="item-custom">
              刻字：{{ item.customizationText }}
            </text>
          </view>

          <!-- 价格和数量 -->
          <view class="item-price-qty">
            <text class="item-unit-price">¥{{ parseFloat(item.sku.price).toFixed(2) }}</text>
            <text class="item-qty">x{{ item.quantity }}</text>
            <text class="item-subtotal">
              ¥{{ (parseFloat(item.sku.price) * item.quantity).toFixed(2) }}
            </text>
          </view>
        </view>
      </view>

      <!-- 3. 订单汇总 -->
      <view class="section-card summary-section">
        <view class="section-title">费用明细</view>

        <!-- 金额汇总行 -->
        <view class="summary-row">
          <text class="summary-label">商品合计</text>
          <text class="summary-value">¥{{ itemsTotal }}</text>
        </view>
        <view class="summary-row">
          <text class="summary-label">运费</text>
          <text class="summary-value summary-value--free">免运费</text>
        </view>

        <!-- 货币选择 -->
        <view class="currency-section">
          <text class="summary-label">支付货币</text>
          <view class="currency-options">
            <view
              class="currency-option"
              :class="{ active: selectedCurrency === 'CNY' }"
              @tap="selectCurrency('CNY')"
            >
              <view class="currency-radio">
                <view v-if="selectedCurrency === 'CNY'" class="currency-radio-dot" />
              </view>
              <text class="currency-label">人民币（CNY）</text>
            </view>
            <view
              class="currency-option"
              :class="{ active: selectedCurrency === 'USD' }"
              @tap="selectCurrency('USD')"
            >
              <view class="currency-radio">
                <view v-if="selectedCurrency === 'USD'" class="currency-radio-dot" />
              </view>
              <text class="currency-label">美元（USD）</text>
            </view>
          </view>
        </view>

        <!-- USD 换算显示 -->
        <view v-if="selectedCurrency === 'USD'" class="exchange-row">
          <text class="exchange-label">
            <van-loading v-if="fetchingRate" size="24rpx" />
            <template v-else>
              参考汇率：1 USD ≈ {{ exchangeRate }} CNY
            </template>
          </text>
          <text class="exchange-amount">
            {{ fetchingRate ? '计算中...' : `$${usdTotal}` }}
          </text>
        </view>

        <!-- 合计 -->
        <view class="summary-total-row">
          <text class="total-label">合计</text>
          <text class="total-amount">
            <template v-if="selectedCurrency === 'CNY'">¥{{ itemsTotal }}</template>
            <template v-else-if="fetchingRate">计算中...</template>
            <template v-else>${{ usdTotal }}</template>
          </text>
        </view>
      </view>

      <!-- 4. 买家备注 -->
      <view class="section-card remark-section">
        <view class="section-title">买家备注</view>
        <van-field
          v-model="remark"
          type="textarea"
          placeholder="选填，可备注特殊要求"
          :maxlength="200"
          autosize
          show-word-limit
          class="remark-field"
        />
      </view>

      <!-- 底部提交栏 -->
      <view class="bottom-bar">
        <view class="bottom-total">
          <text class="bottom-total-label">合计：</text>
          <text class="bottom-total-price">
            <template v-if="selectedCurrency === 'CNY'">¥{{ itemsTotal }}</template>
            <template v-else-if="fetchingRate">计算中...</template>
            <template v-else>${{ usdTotal }}</template>
          </text>
        </view>
        <van-button
          type="primary"
          :loading="submitting"
          :disabled="submitting || orderItems.length === 0"
          class="submit-btn"
          @tap="submitOrder"
        >
          提交订单
        </van-button>
      </view>
    </block>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Taro, { useRouter } from '@tarojs/taro'
import { useOrderStore } from '../../../stores/order'
import { useCartStore } from '../../../stores/cart'
import { getExchangeRate } from '../../../api/payments'
import type { Address } from '../../../api/logistics'
import type { CartItem } from '../../../api/cart'

// ---- 路由 & Store ----
const router = useRouter()
const orderStore = useOrderStore()
const cartStore = useCartStore()

// ---- 状态 ----
const initialLoading = ref(false)
const submitting = ref(false)
const fetchingRate = ref(false)

// ---- 收货地址 ----
const selectedAddress = ref<Address | null>(null)

// ---- 选中的商品 ----
const orderItems = ref<CartItem[]>([])

// ---- 货币 & 汇率 ----
const selectedCurrency = ref<'CNY' | 'USD'>('CNY')
const exchangeRate = ref('7.2') // 默认汇率兜底

// ---- 备注 ----
const remark = ref('')

// ---- 商品合计（CNY） ----
const itemsTotal = computed(() => {
  return orderItems.value
    .reduce((sum, item) => sum + parseFloat(item.sku.price) * item.quantity, 0)
    .toFixed(2)
})

// ---- USD 换算 ----
const usdTotal = computed(() => {
  const cnyAmount = parseFloat(itemsTotal.value)
  const rate = parseFloat(exchangeRate.value)
  if (!rate) return '0.00'
  return (cnyAmount / rate).toFixed(2)
})

// ---- 初始化 ----
onMounted(async () => {
  initialLoading.value = true
  try {
    // 从路由参数获取购物车商品 ID（逗号分隔）
    const cartItemIdsParam = router.params.cartItemIds as string | undefined

    // 确保购物车数据已加载
    if (cartStore.items.length === 0) {
      await cartStore.fetchCart()
    }

    if (cartItemIdsParam) {
      // 从 URL 参数中过滤商品
      const ids = cartItemIdsParam.split(',').map((s) => s.trim()).filter(Boolean)
      orderItems.value = cartStore.items.filter((item) => ids.includes(item.id))
    } else {
      // 使用购物车 store 中已选中的商品
      orderItems.value = cartStore.items.filter((item) =>
        cartStore.selectedItems.has(item.id),
      )
    }
  } finally {
    initialLoading.value = false
  }
})

// ---- 跳转选择地址 ----
function goSelectAddress() {
  Taro.navigateTo({ url: '/pages/address/list/index?from=order' })
}

// ---- 地址选择回调（由地址列表页通过 prevPage 调用） ----
// 声明在 window 上，供 address/list 页面调用
;(Taro.getCurrentInstance()?.page as any).onAddressSelected = (addr: Address) => {
  selectedAddress.value = addr
}

// ---- 选择货币 ----
async function selectCurrency(currency: 'CNY' | 'USD') {
  selectedCurrency.value = currency
  if (currency === 'USD' && exchangeRate.value === '7.2') {
    // 首次切换到 USD 时拉取最新汇率
    await fetchExchangeRate()
  }
}

// ---- 获取汇率 ----
async function fetchExchangeRate() {
  fetchingRate.value = true
  try {
    const res = await getExchangeRate('USD', 'CNY')
    if (res?.rate) exchangeRate.value = res.rate
  } catch {
    // 拉取失败使用兜底汇率，静默处理
  } finally {
    fetchingRate.value = false
  }
}

// ---- 格式化完整地址 ----
function formatAddressFull(addr: Address): string {
  return [addr.province, addr.city, addr.district, addr.detail]
    .filter(Boolean)
    .join(' ')
}

// ---- 格式化规格 ----
function formatSpec(specValues: Record<string, string>): string {
  return Object.values(specValues).join(' / ')
}

// ---- 提交订单 ----
async function submitOrder() {
  // 校验收货地址
  if (!selectedAddress.value) {
    Taro.showToast({ title: '请选择收货地址', icon: 'none' })
    return
  }
  if (orderItems.value.length === 0) {
    Taro.showToast({ title: '请选择商品', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const items = orderItems.value.map((item) => ({
      skuId: Number(item.skuId),
      quantity: item.quantity,
      customizationId: item.customizationText ? undefined : undefined,
    }))

    const order = await orderStore.submitOrder({
      addressId: Number(selectedAddress.value.id),
      items,
      remark: remark.value.trim() || undefined,
    })

    // 提交成功，跳转支付页
    Taro.navigateTo({
      url: `/pages/payment/index?orderId=${order.id}&amount=${order.totalAmount}&currency=${selectedCurrency.value}`,
    })
  } catch (e: any) {
    const msg = e?.message || '提交订单失败，请重试'
    // 库存不足等错误直接展示
    Taro.showModal({
      title: '提交失败',
      content: msg,
      showCancel: false,
      confirmText: '知道了',
    })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss">
.create-order-page {
  background: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 160rpx;
}

/* 加载居中 */
.page-loading {
  display: flex;
  justify-content: center;
  padding: 120rpx 0;
}

/* 通用卡片 */
.section-card {
  background: #fff;
  margin: 16rpx;
  padding: 24rpx;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

/* 地址区域 */
.address-section {
  padding: 28rpx 24rpx;
}

.address-filled {
  display: flex;
  align-items: center;
  gap: 16rpx;

  .address-icon { flex-shrink: 0; }

  .address-detail {
    flex: 1;
    min-width: 0;

    .address-name-row {
      display: flex;
      gap: 16rpx;
      margin-bottom: 8rpx;

      .receiver-name { font-size: 30rpx; font-weight: bold; color: #333; }
      .receiver-phone { font-size: 28rpx; color: #666; }
    }

    .address-text {
      font-size: 26rpx;
      color: #666;
      line-height: 1.5;
    }
  }
}

.address-empty {
  display: flex;
  align-items: center;
  gap: 16rpx;

  .address-placeholder { flex: 1; font-size: 28rpx; color: #c8c9cc; }
}

/* 商品明细 */
.items-empty {
  padding: 24rpx 0;
  text-align: center;
  .items-empty-text { font-size: 26rpx; color: #c8c9cc; }
}

.order-item {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f9f9f9;

  &:last-child { border-bottom: none; }
}

.item-img-placeholder {
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;

  .item-img { width: 100%; height: 100%; }
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;

  .item-name { font-size: 28rpx; color: #333; line-height: 1.4; }
  .item-spec { font-size: 24rpx; color: #999; }
  .item-custom { font-size: 24rpx; color: #1989fa; }
}

.item-price-qty {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
  flex-shrink: 0;

  .item-unit-price { font-size: 26rpx; color: #999; }
  .item-qty { font-size: 24rpx; color: #c8c9cc; }
  .item-subtotal { font-size: 28rpx; color: #333; font-weight: bold; }
}

/* 费用汇总 */
.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
  font-size: 28rpx;

  .summary-label { color: #666; }
  .summary-value { color: #333; }
  .summary-value--free { color: #07c160; }
}

/* 货币选择 */
.currency-section {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-top: 1rpx solid #f0f0f0;
  border-bottom: 1rpx solid #f0f0f0;
  margin: 8rpx 0;
  gap: 16rpx;

  .summary-label { color: #666; font-size: 28rpx; flex-shrink: 0; }
}

.currency-options {
  display: flex;
  gap: 24rpx;
  flex: 1;
  justify-content: flex-end;
}

.currency-option {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  border: 2rpx solid #e8e8e8;
  border-radius: 32rpx;
  transition: all 0.2s;

  &.active {
    border-color: #1989fa;
    background: #f0f8ff;
  }

  .currency-radio {
    width: 28rpx;
    height: 28rpx;
    border-radius: 50%;
    border: 2rpx solid #c8c9cc;
    display: flex;
    align-items: center;
    justify-content: center;

    .currency-radio-dot {
      width: 16rpx;
      height: 16rpx;
      border-radius: 50%;
      background: #1989fa;
    }
  }

  &.active .currency-radio { border-color: #1989fa; }

  .currency-label { font-size: 24rpx; color: #666; }
  &.active .currency-label { color: #1989fa; }
}

/* USD 换算行 */
.exchange-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
  font-size: 24rpx;

  .exchange-label { color: #999; }
  .exchange-amount { color: #ff976a; font-weight: bold; }
}

/* 合计行 */
.summary-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16rpx;
  margin-top: 8rpx;
  border-top: 1rpx solid #f0f0f0;

  .total-label { font-size: 30rpx; font-weight: bold; color: #333; }
  .total-amount { font-size: 36rpx; font-weight: bold; color: #ee0a24; }
}

/* 备注 */
.remark-field {
  border: 1rpx solid #f0f0f0;
  border-radius: 8rpx;
  font-size: 28rpx;
}

/* 底部提交栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 16rpx 32rpx calc(env(safe-area-inset-bottom) + 16rpx);
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.08);

  .bottom-total {
    display: flex;
    align-items: baseline;
    gap: 4rpx;

    .bottom-total-label { font-size: 26rpx; color: #666; }
    .bottom-total-price { font-size: 40rpx; font-weight: bold; color: #ee0a24; }
  }

  .submit-btn {
    width: 280rpx;
    border-radius: 48rpx;
  }
}
</style>
