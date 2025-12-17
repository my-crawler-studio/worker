/**
 * @file src/core/launcher.js
 * @description 浏览器启动器 (Playwright/Interface 适配版)
 */

import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { FingerprintInjector } from "fingerprint-injector";
import { FingerprintGenerator } from "fingerprint-generator";
import { BrowserConfig } from "../../config/browser-config.js";

chromium.use(StealthPlugin());

export async function launchBrowser(customOverrides = {}) {
  const launchOptions = {
    headless: false,
    ...BrowserConfig,
    ...customOverrides,
    args: [...(BrowserConfig.args || []), ...(customOverrides.args || [])],
  };

  const browser = await chromium.launch(launchOptions);

  const gen = new FingerprintGenerator({
    devices: ["desktop"],
    operatingSystems: ["macos"],
    browsers: [{ name: "chrome", minVersion: 110 }],
  });

  // [重要] 这里返回的是 BrowserFingerprintWithHeaders 结构: { headers, fingerprint }
  const fingerprintBundle = gen.getFingerprint();

  const injector = new FingerprintInjector();

  return { browser, injector, fingerprintBundle };
}
