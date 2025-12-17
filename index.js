/**
 * @file index.js
 */

import path from "path";
import { fileURLToPath } from "url";
import { initSystem } from "./src/core/bootstrap.js";
import { startInteractiveLoop } from "./src/core/runner.js";

// 假设策略和Profile文件存在
import * as KeywordSearchStrategy from "./src/strategies/keyword-search.js";
import AmazonProfile from "./src/profiles/amazon.js";
import ShopeeProfile from "./src/profiles/shopee.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_CONFIG = {
  profilePath: path.join(__dirname, "./auth/account_profile.json"),
  baseCaptureDir: path.join(__dirname, "./output/data"),
};

const STRATEGIES = { keyword: KeywordSearchStrategy };
const PROFILES = { amazon: AmazonProfile, shopee: ShopeeProfile };

async function main() {
  let system = null;

  try {
    system = await initSystem(APP_CONFIG);
    await startInteractiveLoop(system.ctx, STRATEGIES, PROFILES);
  } catch (error) {
    console.error("❌ 致命错误:", error);
  } finally {
    if (system) {
      console.log("🧹 清理资源...");
      if (system.context) await system.context.close(); // 触发 HAR 保存
      if (system.browser) await system.browser.close();
      console.log("👋 Done.");
    }
  }
}

main();