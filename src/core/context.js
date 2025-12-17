/**
 * @file src/core/context.js
 * @description 上下文工厂 (Playwright Native Storage 版)。
 * 升级：使用 context.storageState() 一键导出所有源的会话数据。
 */

import * as fileUtils from "../utils/file-system.js";
import { delay } from "../utils/helpers.js";

/**
 * 构建业务上下文
 */
export function buildContext(page, context, browser, profileData, profilePath) {
  
  // === 原生光标模拟器 (保持不变，非常好用) ===
  const cursor = {
    async move(target) {
      try {
        const locator = typeof target === 'string' ? page.locator(target).first() : target;
        await locator.scrollIntoViewIfNeeded().catch(() => {});
        const box = await locator.boundingBox();
        if (!box) return;
        const x = box.x + box.width / 2 + (Math.random() - 0.5) * (box.width * 0.5);
        const y = box.y + box.height / 2 + (Math.random() - 0.5) * (box.height * 0.5);
        await page.mouse.move(x, y, { steps: 10 + Math.floor(Math.random() * 15) });
      } catch (e) {}
    },
    async click(target) {
      const locator = typeof target === 'string' ? page.locator(target).first() : target;
      try {
        await locator.click({ delay: 50 + Math.random() * 100 }); 
      } catch (e) {
        console.warn(`⚠️ 点击失败，尝试强制点击: ${e.message}`);
        await locator.click({ force: true });
      }
    },
    async moveToRandom() {
      const vp = page.viewportSize();
      if (!vp) return;
      const x = Math.random() * vp.width;
      const y = Math.random() * vp.height;
      await page.mouse.move(x, y, { steps: 20 });
    }
  };

  const utils = {
    log: (msg) => console.log(`🤖 [拟人] ${msg}`),
    delay: delay,

    // === [核心升级] 原生全量保存 ===
    saveSession: async () => {
      try {
        // 1. 获取 Playwright 标准状态 (包含所有 Cookie 和所有 Origin 的 LS)
        const storageState = await context.storageState();

        // 2. 更新 profileData
        // 我们不再单独存 cookies/localStorage，而是存一个标准的 storageState 对象
        profileData.storageState = storageState;
        
        // *兼容性清理*：如果存在旧的字段，可以删除它们以减小文件体积
        delete profileData.cookies;
        delete profileData.localStorage;

        profileData.lastActive = new Date().toISOString();

        // 3. 写入文件
        fileUtils.writeJson(profilePath, profileData);
        console.log("💾 完整会话状态 (StorageState) 已保存");
      } catch (error) {
        console.error(`❌ 保存会话失败: ${error.message}`);
      }
    },

    goto: async (url) => page.goto(url, { waitUntil: 'domcontentloaded' }),
    goBack: async () => page.goBack({ waitUntil: 'domcontentloaded' }),
    reload: async () => page.reload({ waitUntil: 'domcontentloaded' }),
  };

  return { page, context, cursor, browser, utils, profileData };
}