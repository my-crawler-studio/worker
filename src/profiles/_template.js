/**
 * @file src/profiles/_template.js
 * @description Profile 配置模板。
 * 新增站点时请复制此文件，并实现对应的选择器和规则。
 *
 * 核心思想：策略(Script)不关心具体的 DOM 结构，只关心功能的抽象（如：搜索框、商品卡片、下一页）。
 * @module Profiles/Template
 */

export default {
  // 站点名称（日志显示用）
  name: "Site Name (e.g., Alibaba)",

  // 匹配的域名列表，用于自动检测是否在正确页面
  domains: ["example.com", "www.example.com"],

  // 入口地址
  baseUrl: "https://www.example.com/",

  // === 核心选择器配置 ===
  selectors: {
    // [搜索] 搜索输入框
    searchInput: "#search-input-id",

    // [导航] 页面顶部的导航链接（用于随机悬停，增加拟人真实度）
    navItems: [".nav-link", "#logo"],

    // [列表] 搜索结果的容器卡片 (必须是包含单个商品所有信息的容器)
    resultCard: ".product-card",

    // [校验] 商品卡片中用于去重的唯一标识属性 (如 data-id, data-asin)
    // 如果该项为空，脚本将跳过校验
    asinAttribute: "data-id",

    // [点击] 卡片内部点击进入详情页的链接 (优先找标题)
    titleLink: "h2 a",

    // [点击] 备用点击链接 (通常是图片)
    imageLink: ".img-container a",

    // [详情] 详情页的关键元素，用于判断页面是否加载完成
    productDetailTitle: "#product-title-h1",

    // [拟人] 详情页中需要随机悬停阅读的元素列表
    detailHoverTargets: [
      "#description",
      ".price-tag",
      "#reviews-section",
      ".breadcrumb",
    ],
  },

  // === 高级行为配置 (可选) ===
  behavior: {
    // 是否需要处理懒加载
    lazyLoad: true,
    // 搜索后是否需要按回车 (true) 还是点击搜索按钮 (false)
    pressEnterToSearch: true,
  },
};
