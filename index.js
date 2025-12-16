/**
 * @file index.js
 * @description 程序主入口.
 * 负责配置注入与模块组装.
 */

import path from "path";
import { fileURLToPath } from "url";
import { initSystem } from "./src/core/bootstrap.js";
import { startInteractiveLoop } from "./src/core/runner.js";

// === 策略与配置加载 ===
import * as KeywordSearchStrategy from "./src/strategies/keyword-search.js";
import AmazonProfile from "./src/profiles/amazon.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 基础路径配置
const APP_CONFIG = {
  profilePath: path.join(__dirname, "./auth/account_profile.json"),
  baseCaptureDir: path.join(__dirname, "./output/data"),
};

async function main() {
  let system = null;

  try {
    // 1. 引导系统启动
    system = await initSystem(APP_CONFIG);

    // 2. 进入交互模式
    // 这里未来可以改为根据命令行参数动态选择 Profile 和 Strategy
    await startInteractiveLoop(
      system.ctx,
      KeywordSearchStrategy,
      AmazonProfile
    );
  } catch (error) {
    console.error("❌ 致命错误:", error);
  } finally {
    // 3. 优雅退出与资源清理
    if (system) {
      if (system.har) await system.har.stop();
      if (system.browser) await system.browser.close();
      console.log("👋 进程已结束");
    }
  }
}

main();
