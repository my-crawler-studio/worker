/**
 * @file config/browser-config.js
 * @description 浏览器启动参数配置文件。
 * @module Config/Browser
 */

export const BrowserConfig = {
  // 默认关闭无头模式，方便调试
  headless: false,

  // 浏览器启动参数
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--window-size=1280,800",
    // 规KZ自动化检测
    "--disablekz-blink-features=AutomationControlled"
  ],

  // 视口设置
  defaultViewport: null,

  // 忽略 HTTPS 错误
  ignoreHTTPSErrors: true,

  // 默认超时设置
  timeout: 30000,
};