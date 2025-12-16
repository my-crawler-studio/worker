/**
 * @file src/core/launcher.js
 * @description 浏览器启动器，负责初始化 Puppeteer、Stealth 插件及指纹注入。
 * @module Core/Launcher
 * @author JS-Master
 */

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { FingerprintInjector } from "fingerprint-injector";
import { FingerprintGenerator } from "fingerprint-generator";

// 注册插件
puppeteer.use(StealthPlugin());

/**
 * 启动浏览器实例
 * @param {Object} config - 浏览器配置对象
 * @returns {Promise<{browser: Browser, injector: FingerprintInjector, fingerprint: Object}>}
 */
export async function launchBrowser(config) {
    const browser = await puppeteer.launch({
        headless: config.Headless,
        args: config.Args || ["--no-sandbox", "--window-size=1280,800"],
        defaultViewport: null,
    });

    // 初始化指纹生成器与注入器
    const gen = new FingerprintGenerator({ devices: ["desktop"], operatingSystems: ["macos"] });
    const fingerprint = gen.getFingerprint();
    const injector = new FingerprintInjector();

    return { browser, injector, fingerprint };
}
