<template>
  <view class="index-page">
    <!-- 顶部搜索栏 -->
    <view class="search-bar" @tap="goSearch">
      <van-icon name="search" size="36rpx" color="#999" />
      <text class="search-placeholder">搜索校庆纪念品</text>
    </view>

    <!-- 校友认证提示横幅 -->
    <view v-if="userStore.isLoggedIn && !userStore.isVerified" class="verify-banner" @tap="goVerify">
      <van-icon name="info-o" color="#1989fa" />
      <text>请完成校友身份认证后才能下单购买</text>
      <van-icon name="arrow" color="#1989fa" />
    </view>

    <!-- 轮播图 -->
    <swiper class="banner-swiper" indicator-dots autoplay circular :interval="4000">
      <swiper-item v-for="banner in banners" :key="banner.id" @tap="onBannerTap(banner)">
        <image class="banner-img" :src="banner.imageUrl" mode="aspectFill" />
      </swiper-item>
      <swiper-item v-if="!banners.length">
        <view class="banner-placeholder">
          <text>校庆纪念品认购平台</text>
        </view>
      </swiper-item>
    </swiper>

    <!-- 公告 -->
    <view v-if="announcement" class="announcement-bar">
      <van-icon name="volume-o" color="#ff976a" size="32rpx" />
      <text class="announcement-text">{{ announcement.title }}</text>
    </view>

    <!-- 商品分类快捷入口 -->
    <view class="card">
      <view class="section-title">商品分类</view>
      <view class="category-grid">
        <view
          v-for="cat in categories"
          :key="cat.id"
          class="category-item"
          @tap="goCategory(cat)"
        >
          <image v-if="cat.iconUrl" class="category-icon" :src="cat.iconUrl" mode="aspectFit" />
          <view v-else class="category-icon-placeholder">
            <van-icon name="shop-o" size="48rpx" color="#1989fa" />
          </view>
          <text class="category-name">{{ cat.name }}</text>
        </view>
      </view>
    </view>

    <!-- 热销商品 -->
    <view class="card">
      <view class="section-title">
        <text>热销推荐</text>
        <text class="more" @tap="goProductList">查看全部 ></text>
      </view>
      <view class="product-grid">
        <view
          v-for="product in hotProducts"
          :key="product.id"
          class="product-card"
          @tap="goProduct(product.id)"
        >
          <image class="product-img" :src="product.coverImage || '/assets/placeholder.png'" mode="aspectFill" />
          <view class="product-info">
            <text class="product-name">{{ product.name }}</text>
            <view class="product-bottom">
              <text class="product-price">¥{{ parseFloat(product.price).toFixed(2) }}</text>
              <text class="product-sales">已售{{ product.salesCount }}件</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部安全距离 -->
    <view class="safe-bottom" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Taro from '@tarojs/taro'
import { useUserStore } from '../../stores/user'
import { getCategories, getProducts } from '../../api/products'
import type { ProductCategory, Product } from '../../api/products'

const userStore = useUserStore()
const banners = ref<any[]>([])
const announcement = ref<any>(null)
const categories = ref<ProductCategory[]>([])
const hotProducts = ref<Product[]>([])

onMounted(async () => {
  userStore.restoreFromStorage()
  await Promise.all([
    fetchCategories(),
    fetchHotProducts(),
  ])
  if (userStore.isLoggedIn) {
    userStore.fetchAlumniStatus()
  }
})

async function fetchCategories() {
  try {
    categories.value = await getCategories()
  } catch {}
}

async function fetchHotProducts() {
  try {
    const result = await getProducts({ page: 1, pageSize: 6 })
    hotProducts.value = result.list
  } catch {}
}

function goSearch() {
  Taro.navigateTo({ url: '/pages/product/list/index?focus=1' })
}

function goVerify() {
  Taro.navigateTo({ url: '/pages/profile/alumni-verify/index' })
}

function onBannerTap(banner: any) {
  if (banner.linkType === 'product' && banner.linkValue) {
    Taro.navigateTo({ url: `/pages/product/detail/index?id=${banner.linkValue}` })
  }
}

function goCategory(cat: ProductCategory) {
  Taro.navigateTo({ url: `/pages/product/list/index?categoryId=${cat.id}&categoryName=${cat.name}` })
}

function goProductList() {
  Taro.switchTab({ url: '/pages/product/list/index' })
}

function goProduct(id: string) {
  Taro.navigateTo({ url: `/pages/product/detail/index?id=${id}` })
}
</script>

<style lang="scss">
.index-page {
  background: #f5f5f5;
  min-height: 100vh;
}

.search-bar {
  display: flex;
  align-items: center;
  background: #fff;
  margin: 20rpx 24rpx;
  padding: 16rpx 24rpx;
  border-radius: 50rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06);

  .search-placeholder {
    color: #999;
    font-size: 28rpx;
    margin-left: 12rpx;
  }
}

.verify-banner {
  display: flex;
  align-items: center;
  background: #e8f3ff;
  padding: 16rpx 24rpx;
  font-size: 26rpx;
  color: #1989fa;
  gap: 12rpx;
}

.banner-swiper {
  width: 100%;
  height: 320rpx;

  .banner-img {
    width: 100%;
    height: 100%;
  }

  .banner-placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #1989fa, #07c160);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 40rpx;
    font-weight: bold;
  }
}

.announcement-bar {
  display: flex;
  align-items: center;
  background: #fff7e6;
  padding: 16rpx 24rpx;
  gap: 12rpx;
  font-size: 26rpx;

  .announcement-text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #666;
  }
}

.card {
  background: #fff;
  margin: 16rpx 0;
  padding: 24rpx;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 20rpx;

  .more {
    font-size: 26rpx;
    color: #1989fa;
    font-weight: normal;
  }
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24rpx;

  .category-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;

    .category-icon {
      width: 80rpx;
      height: 80rpx;
    }

    .category-icon-placeholder {
      width: 80rpx;
      height: 80rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f0f7ff;
      border-radius: 50%;
    }

    .category-name {
      font-size: 24rpx;
      color: #666;
      text-align: center;
    }
  }
}

.product-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;

  .product-card {
    background: #f9f9f9;
    border-radius: 12rpx;
    overflow: hidden;

    .product-img {
      width: 100%;
      height: 240rpx;
    }

    .product-info {
      padding: 12rpx;

      .product-name {
        font-size: 26rpx;
        color: #333;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
        line-height: 1.4;
        margin-bottom: 8rpx;
      }

      .product-bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .product-price {
          color: #ee0a24;
          font-size: 28rpx;
          font-weight: bold;
        }

        .product-sales {
          font-size: 22rpx;
          color: #999;
        }
      }
    }
  }
}

.safe-bottom {
  height: env(safe-area-inset-bottom);
  padding-bottom: 40rpx;
}
</style>
