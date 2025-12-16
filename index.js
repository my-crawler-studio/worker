/**
 * @file index.js
 * @description 程序主入口，负责依赖注入、环境初始化及任务调度。
 */

import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import readline from "readline-sync";
import PuppeteerHar from "puppeteer-har";

// 模块导入
import { launchBrowser } from "./src/core/launcher.js";
import { buildContext } from "./src/core/context.js";
import { setupNetworkCapture } from "./src/utils/network-capture.js"; // 假设你已抽离此函数
import { getFormattedTimestamp } from "./src/utils/helpers.js";

// 导入策略与配置 (可以在此处动态加载)
import * as KeywordSearchStrategy from "./src/strategies/keyword-search.js";
import AmazonProfile from "./src/profiles/amazon.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  ProfilePath: path.join(__dirname, "./auth/account_profile.json"),
  BaseCaptureDir: path.join(__dirname, "./output/data"),
};

async function main() {
  // 1. 初始化环境与目录
  const timestamp = getFormattedTimestamp();
  const sessionDir = path.join(CONFIG.BaseCaptureDir, timestamp);
  fs.ensureDirSync(path.join(sessionDir, "dumps"));
  console.log(`📂 [系统] 数据保存目录: ${sessionDir}`);

  // 2. 加载或初始化本地 Profile 数据 (Cookies/Fingerprint)
  let profileData = loadOrInitProfileData(CONFIG.ProfilePath);

  // 3. 启动核心引擎
  const { browser, injector, fingerprint } = await launchBrowser();
  const page = await browser.newPage();

  // 注入指纹 (使用存储的指纹或新生成的)
  await injector.attachFingerprintToPuppeteer(
    page,
    profileData.fingerprint || fingerprint
  );

  // 4. 启动录制 (Har & Network Dump)
  const har = new PuppeteerHar(page);
  await har.start({
    path: path.join(sessionDir, "traffic.har"),
    saveResponse: true,
  });
  setupNetworkCapture(page, path.join(sessionDir, "dumps")); // 建议抽离网络拦截逻辑

  // 5. 恢复状态
  if (profileData.cookies && profileData.cookies.length > 0) {
    console.log("🍪 [系统] 恢复 Cookies...");
    await page.browserContext().setCookie(...profileData.cookies);
  }

  // 6. 构建上下文
  const ctx = buildContext(page, browser, profileData, CONFIG.ProfilePath);

  // 7. 调度任务 (这里演示如何使用配置与策略分离)
  // 未来你可以根据命令行参数选择不同的 Profile 和 Strategy
  const currentStrategy = KeywordSearchStrategy;
  const currentProfile = AmazonProfile;

  console.log("\n==================================================");
  console.log(`✅ 系统就绪 - 目标: ${currentProfile.name}`);
  console.log("👉 输入 'r' : 执行当前策略");
  console.log("👉 输入 'q' : 退出");
  console.log("==================================================\n");

  let isRunning = true;
  while (isRunning) {
    const command = readline.question("Command (r/q) > ");
    if (command.toLowerCase() === "r") {
      console.log("▶️ 开始执行策略...");
      // 核心：将配置注入策略
      await currentStrategy.run(ctx, currentProfile);
    } else if (command.toLowerCase() === "q") {
      isRunning = false;
    }
  }

  await har.stop();
  await browser.close();
}

function loadOrInitProfileData(filePath) {
  if (fs.existsSync(filePath)) return fs.readJsonSync(filePath);
  return { createdAt: new Date().toISOString(), cookies: [] }; // 指纹在 launcher 中生成并回填
}

main();
