/**
 * @file src/core/context.js
 * @description 上下文工厂 (Playwright 原生精简版)。
 * 移除 ghost-cursor，使用 Playwright 原生 API 实现拟人化操作。
 */

import * as fileUtils from "../utils/file-system.js";
import { delay } from "../utils/helpers.js";

/**
 * 构建业务上下文
 */
export function buildContext(page, context, browser, profileData, profilePath) {
  
  // === 原生光标模拟器 ===
  // 保持与旧策略代码的接口兼容 (cursor.click, cursor.move)
  const cursor = {
    /**
     * 移动鼠标到指定元素
     * @param {string|Locator} target - 选择器字符串或 Locator 对象
     */
    async move(target) {
      try {
        const locator = typeof target === 'string' ? page.locator(target).first() : target;
        
        // 1. 滚动到视口 (智能滚动)
        // Playwright 会自动处理，但显式调用更安全
        await locator.scrollIntoViewIfNeeded().catch(() => {});

        // 2. 获取元素中心坐标 (boundingBox)
        const box = await locator.boundingBox();
        if (!box) return; // 元素不可见，忽略

        // 3. 计算带随机偏移的目标点
        const x = box.x + box.width / 2 + (Math.random() - 0.5) * (box.width * 0.5);
        const y = box.y + box.height / 2 + (Math.random() - 0.5) * (box.height * 0.5);

        // 4. 执行平滑移动
        // steps: 10-25 之间随机，模拟人类移动速度
        await page.mouse.move(x, y, { steps: 10 + Math.floor(Math.random() * 15) });
      } catch (e) {
        // 忽略移动过程中的错误（如元素突然消失）
      }
    },

    /**
     * 点击指定元素 (移动 -> 点击)
     * @param {string|Locator} target 
     */
    async click(target) {
      const locator = typeof target === 'string' ? page.locator(target).first() : target;
      try {
        // 使用 Playwright 原生 click
        // 它会自动执行: 滚动 -> 等待可见 -> 等待无遮挡 -> 移动鼠标 -> 按下 -> 释放
        await locator.click({ delay: 50 + Math.random() * 100 }); 
      } catch (e) {
        console.warn(`⚠️ 点击失败，尝试强制点击: ${e.message}`);
        await locator.click({ force: true });
      }
    },

    /**
     * 随机移动 (防发呆)
     */
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

    // 保存会话 (Cookie + LocalStorage)
    saveSession: async () => {
      try {
        // 1. 保存 Cookies
        const cookies = await context.cookies();
        
        // 2. 保存 LocalStorage
        let localStorageData = {};
        try {
            // 需要在页面上下文中执行
            const jsonStr = await page.evaluate(() => JSON.stringify(window.localStorage));
            localStorageData = JSON.parse(jsonStr);
        } catch(e) {
            // 如果页面已关闭或上下文失效，可能获取失败
        }

        profileData.cookies = cookies;
        profileData.localStorage = localStorageData;
        profileData.lastActive = new Date().toISOString();

        fileUtils.writeJson(profilePath, profileData);
        console.log("💾 会话状态已保存");
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