/**
 * @file config/browser-config.js
 * @description 浏览器启动参数配置文件。
 * 定义了 Puppeteer 启动时的各项参数，如无头模式、窗口大小、沙箱设置等。
 * @module Config/Browser
 */

export const BrowserConfig = {
  // 是否开启无头模式 (根据你的 .env 或原始设置调整)
  headless: false,

  // 浏览器启动参数
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--window-size=1280,800",
    // 如果需要禁用自动化控制提示，可添加:
    // "--disable-blink-features=AutomationControlled"
  ],

  // 设置为 null 以禁用默认的 800x600 视口，跟随窗口大小
  defaultViewport: null,

  // 忽略 HTTPS 错误 (开发环境下常用)
  ignoreHTTPSErrors: true,

  // 可以在这里配置超时时间
  timeout: 30000,
};
