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
import { BrowserConfig } from "../../config/browser-config.js"; // [引用新增]

// 注册插件
puppeteer.use(StealthPlugin());

/**
 * 启动浏览器实例
 * @param {Object} customOverrides - 运行时传入的覆盖配置 (优先级最高)
 * @returns {Promise<{browser: Browser, injector: FingerprintInjector, fingerprint: Object}>}
 */
export async function launchBrowser(customOverrides = {}) {
    // 合并配置：默认配置 < 传入覆盖配置
    const launchOptions = {
        ...BrowserConfig,
        ...customOverrides,
        // 确保 args 是数组合并而不是替换 (可选，视需求而定，这里简单处理为优先使用配置文件的args)
        args: customOverrides.args || BrowserConfig.args,
    };

    const browser = await puppeteer.launch(launchOptions);

    // 初始化指纹生成器与注入器
    const gen = new FingerprintGenerator({ devices: ["desktop"], operatingSystems: ["macos"] });
    const fingerprint = gen.getFingerprint();
    const injector = new FingerprintInjector();

    return { browser, injector, fingerprint };
}