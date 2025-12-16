/**
 * @file src/core/bootstrap.js
 * @description 系统启动引导模块。
 * 负责：环境初始化、浏览器启动、插件挂载、上下文构建。
 */

import path from "path";
import fs from "fs-extra";
import PuppeteerHar from "puppeteer-har";
import { launchBrowser } from "./launcher.js";
import { buildContext } from "./context.js";
import { setupNetworkCapture } from "../utils/network-capture.js";
import { getFormattedTimestamp } from "../utils/helpers.js";
import * as fileUtils from "../utils/file-system.js";

/**
 * 初始化爬虫系统环境
 * @param {Object} config - 基础路径配置
 * @returns {Promise<Object>} 系统实例 { browser, page, ctx, har, sessionDir }
 */
export async function initSystem(config) {
  const { profilePath, baseCaptureDir } = config;

  // 1. 准备目录结构
  const timestamp = getFormattedTimestamp();
  const sessionDir = path.join(baseCaptureDir, timestamp);
  fileUtils.ensureDir(path.join(sessionDir, "dumps"));
  console.log(`📂 [系统] 数据保存目录: ${sessionDir}`);

  // 2. 加载或初始化账号数据
  let profileData = fileUtils.readJson(profilePath) || {
    createdAt: new Date().toISOString(),
    cookies: [],
  };

  // 3. 启动浏览器 (配置已在 launcher 内部处理)
  const { browser, injector, fingerprint } = await launchBrowser();
  const page = await browser.newPage();

  // 4. 注入环境指纹
  // 优先使用 Profile 中保存的指纹，保持账号一致性
  const finalFingerprint = profileData.fingerprint || fingerprint;
  await injector.attachFingerprintToPuppeteer(page, finalFingerprint);

  // 如果是新指纹，保存回 Profile
  if (!profileData.fingerprint) {
    profileData.fingerprint = finalFingerprint;
    fileUtils.writeJson(profilePath, profileData);
  }

  // 5. 挂载流量录制 (HAR & Network Dumps)
  const har = new PuppeteerHar(page);
  await har.start({
    path: path.join(sessionDir, "traffic.har"),
    saveResponse: true,
  });
  setupNetworkCapture(page, path.join(sessionDir, "dumps"));

  // 6. 恢复 Cookie 状态
  if (profileData.cookies && profileData.cookies.length > 0) {
    console.log("🍪 [系统] 恢复 Cookies...");
    await page.setCookie(...profileData.cookies);
  }

  // 7. 构建业务上下文
  const ctx = buildContext(page, browser, profileData, profilePath);

  return { browser, page, ctx, har, sessionDir };
}
