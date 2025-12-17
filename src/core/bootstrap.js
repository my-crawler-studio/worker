/**
 * @file src/core/bootstrap.js
 * @description 系统启动引导模块 (Playwright Native Storage 版)。
 * 核心：在 Context 创建阶段直接注入 storageState，实现自动登录。
 */

import path from "path";
import fs from "fs-extra";
import { launchBrowser } from "./launcher.js";
import { buildContext } from "./context.js";
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

  console.log("⚠️ 检测到旧版数据结构，正在尝试迁移到 Playwright StorageState...");

  // 2. 构造基础结构
  const state = {
    cookies: [],
    origins: []
  };

  // 3. 迁移 Cookies
  if (Array.isArray(profileData.cookies)) {
    state.cookies = profileData.cookies;
  }

  // 4. 迁移 LocalStorage (难点：旧版数据没有 Origin 信息)
  // 策略：尝试从 Cookie 中推断主要域名，或者放弃 LS (让用户重新登录一次即可)
  if (profileData.localStorage && Object.keys(profileData.localStorage).length > 0) {
    // 简单的启发式算法：找 Cookie 里出现最多的域名
    const domainCounts = {};
    state.cookies.forEach(c => {
      const d = c.domain.startsWith('.') ? c.domain.substring(1) : c.domain;
      domainCounts[d] = (domainCounts[d] || 0) + 1;
    });
    
    // 找到最可能的域名 (例如 amazon.com)
    const topDomain = Object.keys(domainCounts).sort((a, b) => domainCounts[b] - domainCounts[a])[0];

    if (topDomain) {
      const origin = `https://www.${topDomain}`; // 猜测 Origin
      console.log(`💡 猜测 LocalStorage 所属源为: ${origin}`);
      
      state.origins.push({
        origin: origin,
        localStorage: Object.entries(profileData.localStorage).map(([k, v]) => ({
          name: k,
          value: String(v) // LS 值必须是字符串
        }))
      });
    } else {
      console.warn("⚠️ 无法推断 LocalStorage 的来源域名，将丢弃旧 LS 数据 (登录状态可能失效，请手动登录一次)");
    }
  }

  return state;
}

/**
 * 校验指纹包
 */
function validateFingerprintBundle(bundle) {
  if (bundle && bundle.fingerprint && bundle.fingerprint.screen) {
    return { valid: true, screen: bundle.fingerprint.screen, navigator: bundle.fingerprint.navigator, type: 'new'};
  }
  if (bundle && bundle.screen && bundle.navigator) {
     return { valid: true, screen: bundle.screen, navigator: bundle.navigator, type: 'legacy'};
  }
  return { valid: false };
}

export async function initSystem(config) {
  const { profilePath, baseCaptureDir } = config;

  // 1. 准备目录
  const timestamp = getFormattedTimestamp();
  const sessionDir = path.join(baseCaptureDir, timestamp);
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
  // 这一步将数据转换为 Playwright 原生格式
  const storageState = normalizeStorageState(profileData);

  // 4. 创建 BrowserContext (直接注入状态!)
  const contextOptions = {
    viewport: { width: screen.width, height: screen.height },
    userAgent: navigator.userAgent,
    locale: navigator.language,
    deviceScaleFactor: screen.devicePixelRatio,
    recordHar: {
        path: path.join(sessionDir, "traffic.har"),
        mode: 'full', 
        content: 'embed',
    },
    ignoreHTTPSErrors: true,
    
    // 🔥 这里是奇迹发生的地方：Playwright 会自动将数据分发到各个域名
    storageState: storageState 
  };

  const context = await browser.newContext(contextOptions);

  // 5. 注入指纹
  await injector.attachFingerprintToPlaywright(context, currentBundle);

  // 6. 创建页面
  const page = await context.newPage();

  // 7. 构建上下文
  const ctx = await buildContext(page, context, browser, profileData, profilePath);

  return { browser, context, page, ctx, sessionDir };
}