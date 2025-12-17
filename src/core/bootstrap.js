/**
 * @file src/core/bootstrap.js
 * @description 系统启动引导模块 (最终完整版)。
 * 包含：原生 StorageState 注入、指纹自动修复、以及恢复的 Dumps 保存功能。
 */

import path from "path";
import fs from "fs-extra";
import { launchBrowser } from "./launcher.js";
import { buildContext } from "./context.js";
import { setupNetworkCapture } from "../utils/network-capture.js";
import { getFormattedTimestamp } from "../utils/helpers.js";
import * as fileUtils from "../utils/file-system.js";

/**
 * 智能构建 storageState 对象
 * 兼容旧版数据 (flat cookies/localStorage) 和新版标准数据
 */
function normalizeStorageState(profileData) {
  // 1. 如果已经是新版结构，直接返回
  if (profileData.storageState) {
    return profileData.storageState;
  }

  console.log(
    "⚠️ 检测到旧版数据结构，正在尝试迁移到 Playwright StorageState..."
  );

  // 2. 构造基础结构
  const state = {
    cookies: [],
    origins: [],
  };

  // 3. 迁移 Cookies
  if (Array.isArray(profileData.cookies)) {
    state.cookies = profileData.cookies;
  }

  // 4. 迁移 LocalStorage
  if (
    profileData.localStorage &&
    Object.keys(profileData.localStorage).length > 0
  ) {
    const domainCounts = {};
    state.cookies.forEach((c) => {
      const d = c.domain.startsWith(".") ? c.domain.substring(1) : c.domain;
      domainCounts[d] = (domainCounts[d] || 0) + 1;
    });

    // 找到最可能的域名
    const topDomain = Object.keys(domainCounts).sort(
      (a, b) => domainCounts[b] - domainCounts[a]
    )[0];

    if (topDomain) {
      const origin = `https://www.${topDomain}`;
      console.log(`💡 猜测 LocalStorage 所属源为: ${origin}`);

      state.origins.push({
        origin: origin,
        localStorage: Object.entries(profileData.localStorage).map(
          ([k, v]) => ({
            name: k,
            value: String(v),
          })
        ),
      });
    } else {
      console.warn("⚠️ 无法推断 LocalStorage 的来源域名，将丢弃旧 LS 数据");
    }
  }

  return state;
}

/**
 * 校验指纹包
 */
function validateFingerprintBundle(bundle) {
  if (bundle && bundle.fingerprint && bundle.fingerprint.screen) {
    return {
      valid: true,
      screen: bundle.fingerprint.screen,
      navigator: bundle.fingerprint.navigator,
      type: "new",
    };
  }
  if (bundle && bundle.screen && bundle.navigator) {
    return {
      valid: true,
      screen: bundle.screen,
      navigator: bundle.navigator,
      type: "legacy",
    };
  }
  return { valid: false };
}

export async function initSystem(config) {
  const { profilePath, baseCaptureDir } = config;

  // 1. 准备目录
  const timestamp = getFormattedTimestamp();
  const sessionDir = path.join(baseCaptureDir, timestamp);
  // 确保 dumps 目录存在
  await fs.ensureDir(path.join(sessionDir, "dumps"));
  console.log(`📂 [系统] 数据保存目录: ${sessionDir}`);

  // 2. 加载数据
  let profileData = fileUtils.readJson(profilePath) || {
    createdAt: new Date().toISOString(),
  };

  // 3. 启动浏览器
  const { browser, injector, fingerprintBundle } = await launchBrowser();

  // === 指纹处理 ===
  let currentBundle = profileData.fingerprint;
  let validation = validateFingerprintBundle(currentBundle);

  if (!validation.valid) {
    console.warn("⚠️ 指纹更新...");
    currentBundle = fingerprintBundle;
    profileData.fingerprint = currentBundle;
    fileUtils.writeJson(profilePath, profileData);
    validation = validateFingerprintBundle(currentBundle);
  }
  const { screen, navigator } = validation;

  // === [核心] 准备 StorageState ===
  const storageState = normalizeStorageState(profileData);

  // 4. 创建 BrowserContext (直接注入状态)
  const contextOptions = {
    viewport: { width: screen.width, height: screen.height },
    userAgent: navigator.userAgent,
    locale: navigator.language,
    deviceScaleFactor: screen.devicePixelRatio,
    recordHar: {
      path: path.join(sessionDir, "traffic.har"),
      mode: "full",
      content: "embed",
    },
    ignoreHTTPSErrors: true,
    storageState: storageState,
  };

  const context = await browser.newContext(contextOptions);

  // 5. 注入指纹
  await injector.attachFingerprintToPlaywright(context, currentBundle);

  // 6. 创建页面
  const page = await context.newPage();

  // === 7. [新增] 恢复网络捕获 (Dumps) ===
  // 传入 page 和 dumps 目录路径，开始监听响应并保存
  setupNetworkCapture(page, path.join(sessionDir, "dumps"));
  console.log("🕸️  网络捕获 (Dumps) 已挂载");
  // ===================================

  // 8. 构建上下文 (注意：如果你 context.js 中的 buildContext 不是 async，这里不需要 await，保持原样即可)
  const ctx = await buildContext(page, context, browser, profileData, profilePath);

  return { browser, context, page, ctx, sessionDir };
}
