/**
 * @file src/core/bootstrap.js
 * @description 系统启动引导模块 (接口严格匹配版)
 */

import path from "path";
import fs from "fs-extra";
import { launchBrowser } from "./launcher.js";
import { buildContext } from "./context.js";
import { getFormattedTimestamp } from "../utils/helpers.js";
import * as fileUtils from "../utils/file-system.js";

/**
 * 校验指纹包是否有效
 * @param {Object} bundle - 可能是 BrowserFingerprintWithHeaders 或旧结构
 */
function validateFingerprintBundle(bundle) {
  // 情况 A: 新接口结构 { fingerprint: { screen: ... }, headers: ... }
  if (bundle && bundle.fingerprint && bundle.fingerprint.screen) {
    return {
      valid: true,
      screen: bundle.fingerprint.screen,
      navigator: bundle.fingerprint.navigator,
      type: "new",
    };
  }

  // 情况 B: 旧结构 (直接是 Fingerprint 对象) - 用于兼容旧存档
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
  await fs.ensureDir(path.join(sessionDir, "dumps"));
  console.log(`📂 [系统] 数据保存目录: ${sessionDir}`);

  // 2. 加载数据
  let profileData = fileUtils.readJson(profilePath) || {
    createdAt: new Date().toISOString(),
    cookies: [],
    localStorage: {},
  };

  // 3. 启动浏览器 (获取全新的 fingerprintBundle)
  const { browser, injector, fingerprintBundle } = await launchBrowser();

  // === [核心修复：指纹结构归一化] ===
  // 优先使用本地存档的指纹
  let currentBundle = profileData.fingerprint;
  let validation = validateFingerprintBundle(currentBundle);

  if (!validation.valid) {
    console.warn("⚠️ 本地指纹无效或缺失，使用新生成的指纹包...");
    currentBundle = fingerprintBundle;

    // 保存到 Profile (保存完整的 BrowserFingerprintWithHeaders)
    profileData.fingerprint = currentBundle;
    fileUtils.writeJson(profilePath, profileData);

    // 重新校验新指纹
    validation = validateFingerprintBundle(currentBundle);
  } else {
    console.log("🆔 使用已保存的指纹");
  }

  // 此时 validation.screen 必定存在
  const { screen, navigator } = validation;
  // ===================================

  // 4. 创建 BrowserContext
  const contextOptions = {
    viewport: {
      width: screen.width,
      height: screen.height,
    },
    userAgent: navigator.userAgent,
    locale: navigator.language,
    deviceScaleFactor: screen.devicePixelRatio,
    recordHar: {
      path: path.join(sessionDir, "traffic.har"),
      mode: "full",
      content: "embed",
    },
    ignoreHTTPSErrors: true,
  };

  const context = await browser.newContext(contextOptions);

  // 5. 注入指纹
  // 注意：injector.attachFingerprintToPlaywright 支持完整的 BrowserFingerprintWithHeaders
  await injector.attachFingerprintToPlaywright(context, currentBundle);

  // 6. 恢复 Cookie
  if (profileData.cookies && Array.isArray(profileData.cookies)) {
    const validCookies = profileData.cookies.filter(
      (c) => c.name && c.value && c.domain
    );
    if (validCookies.length > 0) {
      console.log(`🍪 恢复 ${validCookies.length} 个 Cookies`);
      await context.addCookies(validCookies);
    }
  }

  // 7. 创建页面
  const page = await context.newPage();

  // 8. 构建上下文
  const ctx = buildContext(page, context, browser, profileData, profilePath);

  return { browser, context, page, ctx, sessionDir };
}
