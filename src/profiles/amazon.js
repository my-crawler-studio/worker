/**
 * @file src/profiles/amazon.js
 * @description Amazon 站点的选择器配置与特定规则。
 */

export default {
  name: "Amazon US",
  type: "search",
  domains: ["amazon.com"],
  baseUrl: "https://www.amazon.com/",

  // 页面元素选择器 (抽离硬编码)
  selectors: {
    searchInput: "#twotabsearchtextbox",
    // 导航栏悬停目标
    navItems: ["#nav-xshop a", "#nav-logo-sprites"],
    // 搜索结果卡片
    resultCard: 'div[data-component-type="s-search-result"]',
    // 只有带有此属性的才是真正商品
    asinAttribute: "data-asin",
    // 优先点击的标题链接
    titleLink: "h2 a",
    // 备用点击链接
    imageLink: ".s-product-image-container a",
    // 详情页关键元素 (用于判断加载完成)
    productDetailTitle: "#productTitle",
    // 详情页悬停目标
    detailHoverTargets: [
      "#imgTagWrapperId",
      "#productTitle",
      "#wayfinding-breadcrumbs_container",
      "#reviewsMedley",
      ".a-icon-star",
      "#ask_feature_div",
    ],
  },
};
