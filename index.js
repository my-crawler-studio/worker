import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { createCursor } from "ghost-cursor";
import { FingerprintInjector } from "fingerprint-injector";
import { FingerprintGenerator } from "fingerprint-generator";
import PuppeteerHar from "puppeteer-har"; // [已恢复]
import path from "path";
import fs from "fs-extra";
import md5 from "md5"; // [已恢复]
import { fileURLToPath } from "url";
import readline from "readline-sync";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === 配置 ===
const CONFIG = {
  ProfileFile: path.join(__dirname, "./auth/account_profile.json"),
  BaseCaptureDir: path.join(__dirname, "./captured_data"), // [已恢复] 数据根目录
  TaskFile: "./tasks/logic.js",
  Headless: false,
};

puppeteer.use(StealthPlugin());

async function main() {
  // === 1. [已恢复] 初始化会话目录 (Session Directory) ===
  const timestamp = getFormattedTimestamp();
  const sessionDir = path.join(CONFIG.BaseCaptureDir, timestamp);
  const currentDumpDir = path.join(sessionDir, "dumps");
  const currentHarPath = path.join(sessionDir, "traffic.har");

  console.log(`📂 [系统] 本次运行数据将保存至: ${sessionDir}`);
  fs.ensureDirSync(currentDumpDir);
  fs.ensureDirSync(path.dirname(currentHarPath));

  // === 2. 初始化指纹 ===
  let profile = loadOrInitProfile();

  // === 3. 启动浏览器 ===
  const browser = await puppeteer.launch({
    headless: CONFIG.Headless,
    args: ["--no-sandbox", "--window-size=1280,800"],
    defaultViewport: null,
  });

  const page = await browser.newPage();
  
  // 注入指纹
  const injector = new FingerprintInjector();
  await injector.attachFingerprintToPuppeteer(page, profile.fingerprint);
  
  // === 4. [已恢复] 启动 HAR 录制 ===
  console.log("📼 [系统] 启动 HAR 全局录制...");
  const har = new PuppeteerHar(page);
  await har.start({ path: currentHarPath, saveResponse: true });

  // === 5. [已恢复] 启动 Dump 文件独立抓取 ===
  // 这里会将抓到的文件存入本次的 dumps 目录
  setupNetworkCapture(page, currentDumpDir);

  // 初始化鼠标
  const cursor = createCursor(page);

  // 恢复 Cookie
  if (profile.cookies && profile.cookies.length > 0) {
    console.log("🍪 [系统] 恢复会话 Cookies...");
    await page.browserContext().setCookie(...profile.cookies);
    await page.goto("https://www.amazon.com", { waitUntil: "domcontentloaded" });
  }

  // === 6. 构造上下文 (Context) ===
  const context = {
    page,
    cursor,
    browser,
    utils: {
      log: (msg) => console.log(`🤖 [拟人] ${msg}`),
      delay: (min, max) => new Promise(r => setTimeout(r, min + Math.random() * (max - min))),
      saveCookies: async () => {
        profile.cookies = await page.cookies();
        profile.lastActive = new Date().toISOString();
        fs.writeJsonSync(CONFIG.ProfileFile, profile, { spaces: 2 });
        console.log("💾 Cookies 已保存");
      }
    }
  };

  // === 7. 交互式循环 ===
  console.log("\n==================================================");
  console.log("✅ 系统就绪。所有流量正在录制中。");
  console.log("👉 输入 'r' : 热加载并执行 tasks/logic.js");
  console.log("👉 输入 'q' : 保存数据并退出");
  console.log("==================================================\n");

  let isRunning = true;
  while (isRunning) {
    const command = readline.question("Command (r/q) > ");
    if (command.toLowerCase() === 'r') {
      await runHotReloadTask(context);
    } else if (command.toLowerCase() === 'q') {
      isRunning = false;
    }
  }

  // === 8. [已恢复] 优雅关闭录制 ===
  console.log("💾 [系统] 正在保存 HAR 文件...");
  await har.stop();
  console.log(`✅ 数据已归档: ${sessionDir}`);

  await browser.close();
}

// === 辅助函数：动态加载器 (保持不变) ===
async function runHotReloadTask(ctx) {
  const taskPath = path.resolve(__dirname, CONFIG.TaskFile);
  if (!fs.existsSync(taskPath)) return console.error("❌ 找不到脚本文件");

  try {
    const importPath = `file://${taskPath}?t=${Date.now()}`;
    const module = await import(importPath);
    if (module.run) {
      console.log("▶️ 开始执行脚本...");
      await module.run(ctx);
      console.log("✅ 脚本执行结束");
    }
  } catch (err) {
    console.error("❌ 脚本错误:", err);
  }
}

// === [已恢复] 辅助函数：网络拦截 ===
function setupNetworkCapture(page, saveDir) {
  page.on("response", async (response) => {
    const url = response.url();
    if (response.status() !== 200) return;

    // 只保存关键类型
    const resourceType = response.request().resourceType();
    if (!["document", "xhr", "fetch"].includes(resourceType)) return;

    try {
      const buffer = await response.buffer();
      const urlParts = url.split("/");
      let nameHint = urlParts[urlParts.length - 1] || "index";
      nameHint = nameHint.replace(/[^a-zA-Z0-9.-]/g, "_").substring(0, 30);

      const hash = md5(url).substring(0, 8);
      const fileName = `${resourceType}_${hash}_${nameHint}`;
      const filePath = path.join(saveDir, fileName);

      await fs.writeFile(filePath, buffer);
    } catch (err) {
      // 忽略空响应或重定向错误
    }
  });
}

// === [已恢复] 辅助函数：时间戳生成 ===
function getFormattedTimestamp() {
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

// === 辅助函数：Profile 加载 (保持不变) ===
function loadOrInitProfile() {
  if (fs.existsSync(CONFIG.ProfileFile)) {
    return fs.readJsonSync(CONFIG.ProfileFile);
  }
  const gen = new FingerprintGenerator({devices:["desktop"], operatingSystems:["macos"]});
  const profile = { 
    createdAt: new Date().toISOString(),
    fingerprint: gen.getFingerprint(), 
    cookies: [] 
  };
  fs.ensureDirSync(path.dirname(CONFIG.ProfileFile));
  fs.writeJsonSync(CONFIG.ProfileFile, profile, { spaces: 2 });
  return profile;
}

main();