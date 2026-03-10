<template>
  <view class="product-list-page">
    <!-- 搜索框 -->
    <view class="search-bar">
      <van-search
        v-model="keyword"
        placeholder="搜索商品"
        @search="onSearch"
        @clear="onClearSearch"
      />
    </view>

    <!-- 分类筛选 -->
    <scroll-view scroll-x class="category-tabs">
      <view
        class="category-tab"
        :class="{ active: !selectedCategoryId }"
        @tap="selectCategory(null)"
      >全部</view>
      <view
        v-for="cat in categories"
        :key="cat.id"
        class="category-tab"
        :class="{ active: selectedCategoryId === cat.id }"
        @tap="selectCategory(cat.id)"
      >{{ cat.name }}</view>
    </scroll-view>

    <!-- 加载中 -->
    <view v-if="loading && !products.length" class="loading-wrap">
      <van-loading size="48rpx" type="spinner" />
    </view>

    <!-- 空状态 -->
    <view v-else-if="!loading && !products.length" class="empty-wrap">
      <van-empty description="暂无商品" />
    </view>

    <!-- 商品列表 -->
    <view v-else class="product-grid">
      <view
        v-for="product in products"
        :key="product.id"
        class="product-card"
        @tap="goDetail(product.id)"
      >
        <image
          class="product-img"
          :src="product.coverImage || '/assets/placeholder.png'"
          mode="aspectFill"
          lazy-load
        />
        <view class="product-info">
          <text class="product-name">{{ product.name }}</text>
          <text v-if="product.nameEn" class="product-name-en">{{ product.nameEn }}</text>
          <view class="product-tags">
            <van-tag v-if="product.isCustomizable" type="primary" size="mini">可刻字</van-tag>
            <van-tag v-if="product.stock < 20 && product.stock > 0" type="warning" size="mini">
              仅剩{{ product.stock }}件
            </van-tag>
            <van-tag v-if="product.stock === 0" type="danger" size="mini">已售罄</van-tag>
          </view>
          <view class="product-bottom">
            <text class="product-price">¥{{ parseFloat(product.price).toFixed(2) }}</text>
            <text class="product-sales">{{ product.salesCount }}人购买</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 加载更多 -->
    <view v-if="hasMore" class="load-more" @tap="loadMore">
      <van-loading v-if="loadingMore" size="32rpx" />
      <text v-else>上拉加载更多</text>
    </view>
    <view v-else-if="products.length" class="no-more">— 已加载全部 —</view>

    <view class="safe-bottom" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Taro, { useRouter } from '@tarojs/taro'
import { getCategories, getProducts } from '../../../api/products'
import type { Product, ProductCategory } from '../../../api/products'

const router = useRouter()

const keyword = ref('')
const selectedCategoryId = ref<string | null>(null)
const categories = ref<ProductCategory[]>([])
const products = ref<Product[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const page = ref(1)
const pageSize = 20
const total = ref(0)
const hasMore = ref(false)

onMounted(async () => {
  // 从路由参数获取初始分类
  if (router.params.categoryId) {
    selectedCategoryId.value = router.params.categoryId as string
  }
  await Promise.all([fetchCategories(), fetchProducts()])
})

async function fetchCategories() {
  try {
    categories.value = await getCategories()
  } catch {}
}

async function fetchProducts(reset = true) {
  if (reset) {
    page.value = 1
    products.value = []
  }
  loading.value = reset

  try {
    const result = await getProducts({
      page: page.value,
      pageSize,
      categoryId: selectedCategoryId.value ? Number(selectedCategoryId.value) : undefined,
      keyword: keyword.value || undefined,
    })
    if (reset) {
      products.value = result.list
    } else {
      products.value.push(...result.list)
    }
    total.value = result.total
    hasMore.value = products.value.length < total.value
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  page.value++
  await fetchProducts(false)
}

function selectCategory(id: string | null) {
  selectedCategoryId.value = id
  fetchProducts()
}

function onSearch() {
  fetchProducts()
}

function onClearSearch() {
  keyword.value = ''
  fetchProducts()
}

function goDetail(id: string) {
  Taro.navigateTo({ url: `/pages/product/detail/index?id=${id}` })
}
</script>

<style lang="scss">
.product-list-page {
  background: #f5f5f5;
  min-height: 100vh;
}

.search-bar {
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
}

.category-tabs {
  background: #fff;
  white-space: nowrap;
  padding: 0 16rpx 16rpx;
  border-bottom: 1rpx solid #f5f5f5;

  .category-tab {
    display: inline-block;
    padding: 8rpx 24rpx;
    font-size: 26rpx;
    color: #666;
    border-radius: 30rpx;
    margin-right: 12rpx;

    &.active {
      background: #e8f3ff;
      color: #1989fa;
      font-weight: bold;
    }
  }
}

.loading-wrap, .empty-wrap {
  display: flex;
  justify-content: center;
  padding: 80rpx 0;
}

.product-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  padding: 16rpx;

  .product-card {
    background: #fff;
    border-radius: 12rpx;
    overflow: hidden;

    .product-img {
      width: 100%;
      height: 250rpx;
    }

    .product-info {
      padding: 16rpx;

      .product-name {
        font-size: 28rpx;
        color: #333;
        font-weight: 500;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
      }

      .product-name-en {
        font-size: 22rpx;
        color: #999;
        margin-top: 4rpx;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .product-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8rpx;
        margin: 8rpx 0;
      }

      .product-bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .product-price {
          color: #ee0a24;
          font-size: 30rpx;
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

.load-more, .no-more {
  text-align: center;
  padding: 24rpx;
  font-size: 26rpx;
  color: #999;
}

.safe-bottom {
  padding-bottom: calc(env(safe-area-inset-bottom) + 40rpx);
}
</style>
