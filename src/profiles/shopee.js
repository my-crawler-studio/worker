/**
 * @file src/profiles/shopee.js
 * @description Shopee 站点的选择器配置 (基于 shopee.co.id 结构)。
 * 类型: Search (适配 KeywordSearch 策略)
 */

export default {
  name: "Shopee ID",
  type: "search", // 声明类型以通过策略检查

  domains: ["shopee.vn", "shopee.com"],
  baseUrl: "https://shopee.vn/",

  // 页面元素选择器 (CSS Selectors)
  selectors: {
    // [搜索] 搜索输入框
    // 源自 search.json: <input class="shopee-searchbar-input__input" ...>
    searchInput: ".shopee-searchbar-input__input",

    // [导航] 悬停目标
    // 源自 navItems.json: 热门搜索词(.uaKe53) 和 Logo区域
    navItems: [".uaKe53", ".header-with-search__logo-wrapper", ".cart-drawer"],

    // [列表] 搜索结果卡片容器
    // 源自 result.json: <li class="... shopee-search-item-result__item" data-sqe="item">
    resultCard: ".shopee-search-item-result__item",

    // [校验] 验证卡片有效性
    // Shopee 卡片带有 data-sqe="item"，以此确保不是空白占位
    asinAttribute: "data-sqe",

    // [点击] 商品链接
    // Shopee 卡片内部由一个 <a> 包裹整体
    titleLink: "a",
    // 备用图片链接 (通常不需要，因为 a 标签包裹了整个卡片)
    imageLink: "img",

    // [详情] 标题元素 (用于验证详情页加载)
    // 转换自 XPath: //h1[@class="vR6K3w"]
    productDetailTitle: "h1.vR6K3w",

    // [拟人] 详情页阅读悬停区域
    // 转换自你提供的 XPath 结构
    detailHoverTargets: [
      ".product-detail", // 商品详情区
      ".page-product__breadcrumb", // 面包屑导航
      ".page-product__shop", // 店铺信息栏
      ".shopee-drawer__contents", // 优惠券/折扣面板
    ],
  },
};
