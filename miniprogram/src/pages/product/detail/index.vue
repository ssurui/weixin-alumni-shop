<template>
  <view class="product-detail-page">
    <van-loading v-if="loading" class="page-loading" size="64rpx" />

    <template v-else-if="product">
      <!-- 商品图片轮播 -->
      <swiper class="product-swiper" indicator-dots circular>
        <swiper-item v-for="img in productImages" :key="img.id">
          <image class="swiper-img" :src="img.imageUrl" mode="aspectFit" />
        </swiper-item>
        <swiper-item v-if="!productImages.length && product.coverImage">
          <image class="swiper-img" :src="product.coverImage" mode="aspectFit" />
        </swiper-item>
      </swiper>

      <!-- 商品基础信息 -->
      <view class="product-info card">
        <view class="price-row">
          <text class="price">¥{{ formatPrice }}</text>
          <text v-if="product.salesCount" class="sales">已售{{ product.salesCount }}件</text>
        </view>
        <view class="product-name">{{ product.name }}</view>
        <view v-if="product.nameEn" class="product-name-en">{{ product.nameEn }}</view>
        <view v-if="product.description" class="product-desc">{{ product.description }}</view>
      </view>

      <!-- 规格选择 -->
      <view class="spec-section card">
        <view class="section-title">选择规格</view>
        <view class="sku-list">
          <view
            v-for="sku in product.skus"
            :key="sku.id"
            class="sku-item"
            :class="{
              active: selectedSku?.id === sku.id,
              disabled: sku.stock === 0
            }"
            @tap="selectSku(sku)"
          >
            <text class="sku-spec">{{ formatSpec(sku.specValues) }}</text>
            <text class="sku-price">¥{{ parseFloat(sku.price).toFixed(2) }}</text>
            <text v-if="sku.stock === 0" class="sku-sold-out">售罄</text>
          </view>
        </view>
      </view>

      <!-- 刻字定制（如果支持） -->
      <view v-if="product.isCustomizable" class="customization-section card">
        <view class="section-title">
          <text>刻字定制</text>
          <van-switch v-model="enableCustomization" size="40rpx" />
        </view>
        <template v-if="enableCustomization">
          <view class="custom-input-wrap">
            <input
              v-model="customText"
              class="custom-input"
              placeholder="请输入刻字内容（最多20字）"
              maxlength="20"
              @blur="validateCustomText"
            />
            <text class="char-count">{{ customText.length }}/20</text>
          </view>
          <view v-if="customTextError" class="custom-error">{{ customTextError }}</view>

          <!-- 字体选择 -->
          <view class="font-select">
            <text class="font-label">字体：</text>
            <view class="font-options">
              <view
                v-for="font in fonts"
                :key="font.name"
                class="font-option"
                :class="{ active: selectedFont === font.name }"
                @tap="selectFont(font.name)"
              >
                <text :style="{ fontFamily: font.name }">{{ font.preview }}</text>
                <text class="font-name">{{ font.displayName }}</text>
              </view>
            </view>
          </view>

          <!-- 预览图 -->
          <view v-if="previewUrl" class="preview-wrap">
            <text class="preview-label">预览效果：</text>
            <image class="preview-img" :src="previewUrl" mode="aspectFit" />
          </view>
          <van-button
            v-else-if="customText.trim()"
            size="small"
            type="primary"
            plain
            :loading="previewLoading"
            @tap="generatePreview"
          >生成预览</van-button>
        </template>
      </view>

      <!-- 商品详情 -->
      <view v-if="product.detailHtml" class="detail-html card">
        <view class="section-title">商品详情</view>
        <rich-text :nodes="product.detailHtml" />
      </view>

      <!-- 评价区 -->
      <view class="reviews-section card" @tap="goReviews">
        <view class="section-title">
          <text>商品评价</text>
          <text class="more">查看全部 ></text>
        </view>
      </view>
    </template>

    <!-- 底部操作栏 -->
    <view class="bottom-bar" v-if="product">
      <view class="bottom-actions">
        <view class="action-item" @tap="goCart">
          <van-icon name="cart-o" size="48rpx" />
          <text>购物车</text>
          <van-badge v-if="cartStore.totalCount > 0" :content="cartStore.totalCount" />
        </view>
        <van-button
          class="add-cart-btn"
          color="#ff976a"
          :disabled="!selectedSku || selectedSku.stock === 0"
          @tap="addToCart"
        >加入购物车</van-button>
        <van-button
          class="buy-btn"
          type="primary"
          :disabled="!selectedSku || selectedSku.stock === 0"
          @tap="buyNow"
        >立即购买</van-button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Taro, { useRouter } from '@tarojs/taro'
import { getProduct } from '../../../api/products'
import { getFonts, validateText, createPreview } from '../../../api/customization'
import { useCartStore } from '../../../stores/cart'
import { useUserStore } from '../../../stores/user'
import type { Product, ProductSku } from '../../../api/products'
import type { Font } from '../../../api/customization'

const router = useRouter()
const cartStore = useCartStore()
const userStore = useUserStore()

const product = ref<Product | null>(null)
const loading = ref(true)
const selectedSku = ref<ProductSku | null>(null)
const enableCustomization = ref(false)
const customText = ref('')
const customTextError = ref('')
const selectedFont = ref('')
const fonts = ref<Font[]>([])
const previewUrl = ref('')
const previewLoading = ref(false)
const customizationId = ref<number | null>(null)

const productImages = computed(() => product.value?.images || [])

const formatPrice = computed(() => {
  if (selectedSku.value) return parseFloat(selectedSku.value.price).toFixed(2)
  if (product.value) return parseFloat(product.value.price).toFixed(2)
  return '0.00'
})

onMounted(async () => {
  const id = router.params.id as string
  if (!id) return

  try {
    product.value = await getProduct(id)
    // 默认选中第一个有库存的SKU
    const availableSku = product.value.skus.find((s) => s.stock > 0)
    if (availableSku) selectedSku.value = availableSku

    // 加载字体
    if (product.value.isCustomizable) {
      fonts.value = await getFonts()
      if (fonts.value.length) selectedFont.value = fonts.value[0].name
    }
  } finally {
    loading.value = false
  }
})

function selectSku(sku: ProductSku) {
  if (sku.stock === 0) return
  selectedSku.value = sku
}

function formatSpec(specValues?: Record<string, string>): string {
  if (!specValues) return '默认规格'
  return Object.values(specValues).join(' / ')
}

function selectFont(name: string) {
  selectedFont.value = name
  previewUrl.value = ''
  customizationId.value = null
}

async function validateCustomText() {
  if (!customText.value.trim()) return
  try {
    await validateText(customText.value)
    customTextError.value = ''
  } catch (e: any) {
    customTextError.value = e.message
  }
}

async function generatePreview() {
  if (!customText.value.trim() || !product.value) return
  previewLoading.value = true
  try {
    const result = await createPreview({
      productId: Number(product.value.id),
      textContent: customText.value,
      fontName: selectedFont.value,
    })
    previewUrl.value = result.previewImageUrl
    customizationId.value = Number(result.id)
  } catch {
    Taro.showToast({ title: '预览生成失败', icon: 'none' })
  } finally {
    previewLoading.value = false
  }
}

async function addToCart() {
  if (!selectedSku.value) {
    Taro.showToast({ title: '请选择规格', icon: 'none' })
    return
  }
  if (!userStore.isLoggedIn) {
    Taro.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  await cartStore.addItem(Number(selectedSku.value.id), 1, {
    customizationText: enableCustomization.value ? customText.value : undefined,
    selectedFont: enableCustomization.value ? selectedFont.value : undefined,
  })
}

async function buyNow() {
  if (!selectedSku.value) {
    Taro.showToast({ title: '请选择规格', icon: 'none' })
    return
  }
  if (!userStore.isLoggedIn) {
    Taro.showToast({ title: '请先登录', icon: 'none' })
    return
  }
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

  // 跳转到创建订单页
  const params = new URLSearchParams({
    skuId: selectedSku.value.id,
    quantity: '1',
    ...(enableCustomization.value && customizationId.value
      ? { customizationId: String(customizationId.value) }
      : {}),
  })
  Taro.navigateTo({ url: `/pages/order/create/index?${params.toString()}` })
}

function goCart() {
  Taro.switchTab({ url: '/pages/cart/index' })
}

function goReviews() {
  if (product.value) {
    Taro.navigateTo({ url: `/pages/reviews/index?productId=${product.value.id}` })
  }
}
</script>

<style lang="scss">
.product-detail-page {
  background: #f5f5f5;
  padding-bottom: 160rpx;
}

.page-loading {
  display: flex;
  justify-content: center;
  padding: 120rpx 0;
}

.product-swiper {
  width: 100%;
  height: 600rpx;
  background: #fff;

  .swiper-img {
    width: 100%;
    height: 100%;
  }
}

.card {
  background: #fff;
  margin-bottom: 16rpx;
  padding: 24rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .more { font-size: 26rpx; color: #1989fa; font-weight: normal; }
}

.product-info {
  .price-row {
    display: flex;
    align-items: baseline;
    gap: 16rpx;
    margin-bottom: 12rpx;

    .price {
      color: #ee0a24;
      font-size: 48rpx;
      font-weight: bold;
    }
    .sales { color: #999; font-size: 24rpx; }
  }

  .product-name {
    font-size: 34rpx;
    font-weight: bold;
    color: #333;
    line-height: 1.4;
  }

  .product-name-en {
    font-size: 26rpx;
    color: #999;
    margin-top: 8rpx;
  }

  .product-desc {
    font-size: 26rpx;
    color: #666;
    margin-top: 12rpx;
    line-height: 1.6;
  }
}

.sku-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;

  .sku-item {
    padding: 12rpx 24rpx;
    border: 2rpx solid #ddd;
    border-radius: 8rpx;
    font-size: 26rpx;
    color: #333;
    position: relative;

    &.active {
      border-color: #1989fa;
      color: #1989fa;
      background: #e8f3ff;
    }

    &.disabled {
      opacity: 0.4;
    }

    .sku-spec { margin-right: 8rpx; }
    .sku-price { color: #ee0a24; }
    .sku-sold-out {
      position: absolute;
      top: -1rpx;
      right: -1rpx;
      background: #999;
      color: #fff;
      font-size: 18rpx;
      padding: 2rpx 8rpx;
      border-radius: 0 8rpx 0 8rpx;
    }
  }
}

.customization-section {
  .custom-input-wrap {
    display: flex;
    align-items: center;
    border: 2rpx solid #eee;
    border-radius: 8rpx;
    padding: 12rpx 16rpx;
    margin-bottom: 12rpx;

    .custom-input { flex: 1; font-size: 28rpx; }
    .char-count { color: #999; font-size: 24rpx; white-space: nowrap; }
  }

  .custom-error { color: #ee0a24; font-size: 24rpx; margin-bottom: 12rpx; }

  .font-select {
    .font-label { font-size: 26rpx; color: #666; }
    .font-options {
      display: flex;
      gap: 16rpx;
      flex-wrap: wrap;
      margin-top: 12rpx;

      .font-option {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 12rpx;
        border: 2rpx solid #ddd;
        border-radius: 8rpx;
        font-size: 28rpx;
        gap: 8rpx;

        .font-name { font-size: 22rpx; color: #666; }
        &.active { border-color: #1989fa; background: #e8f3ff; }
      }
    }
  }

  .preview-wrap {
    margin-top: 16rpx;
    .preview-label { font-size: 26rpx; color: #666; display: block; margin-bottom: 12rpx; }
    .preview-img { width: 100%; height: 200rpx; border-radius: 8rpx; background: #f9f9f9; }
  }
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 16rpx 24rpx calc(env(safe-area-inset-bottom) + 16rpx);
  box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.08);

  .bottom-actions {
    display: flex;
    align-items: center;
    gap: 16rpx;

    .action-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      font-size: 20rpx;
      color: #666;
      position: relative;
      min-width: 80rpx;
    }

    .add-cart-btn, .buy-btn {
      flex: 1;
      height: 80rpx;
      border-radius: 40rpx;
      font-size: 28rpx;
    }
  }
}
</style>
