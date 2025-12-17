/**
 * @file index.js
 * @description 程序主入口。
 * 负责注册所有 Profile 和 Strategy，并启动交互环境。
 */

import path from "path";
import { fileURLToPath } from "url";
import { initSystem } from "./src/core/bootstrap.js";
import { startInteractiveLoop } from "./src/core/runner.js";

// === 导入策略 ===
import * as KeywordSearchStrategy from "./src/strategies/keyword-search.js";

// === 导入 Profile ===
import AmazonProfile from "./src/profiles/amazon.js";
import ShopeeProfile from "./src/profiles/shopee.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_CONFIG = {
  profilePath: path.join(__dirname, "./auth/account_profile.json"),
  baseCaptureDir: path.join(__dirname, "./output/data"),
};

// === 注册中心 ===
const STRATEGIES = {
  keyword: KeywordSearchStrategy,
};

const PROFILES = {
  amazon: AmazonProfile,
  shopee: ShopeeProfile,
};

async function main() {
  let system = null;

  try {
    // 1. 系统初始化
    system = await initSystem(APP_CONFIG);

    // 2. 启动交互循环 (传入注册表)
    await startInteractiveLoop(system.ctx, STRATEGIES, PROFILES);
  } catch (error) {
    console.error("❌ 致命错误:", error);
  } finally {
    // 3. 资源清理 (优化版)
    if (system) {
      console.log("🧹 正在清理资源...");

      // 3.1 停止 HAR 录制
      if (system.har) {
        try {
          await system.har.stop();
        } catch (e) {
          /* 忽略录制停止错误 */
        }
      }

      // 3.2 优先关闭页面 (让插件有机会卸载)
      if (system.page) {
        try {
          // 检查页面是否已经关闭
          if (!system.page.isClosed()) {
            await system.page.close();
          }
        } catch (e) {
          /* 忽略页面关闭错误 */
        }
      }

      // 3.3 最后关闭浏览器
      if (system.browser) {
        try {
          await system.browser.close();
        } catch (e) {
          // 仅在非"会话已关闭"错误时打印，避免刷屏
          if (!e.message.includes("Session closed")) {
            console.error("⚠️ 关闭浏览器时发生警告:", e.message);
          }
        }
      }

      console.log("👋 进程已结束");
    }
  }
}

main();
