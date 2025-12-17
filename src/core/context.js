/**
 * @file src/core/context.js
 * @description 上下文工厂 (Playwright)
 */

import { createCursor } from "ghost-cursor";
import * as fileUtils from "../utils/file-system.js";
import { delay } from "../utils/helpers.js";
// import * as nav from "../actions/navigation.js"; // 确保此文件存在或注释

export function buildContext(page, context, browser, profileData, profilePath) {
  const cursor = createCursor(page);

  const utils = {
    log: (msg) => console.log(`🤖 [拟人] ${msg}`),
    delay: delay,

    saveSession: async () => {
      try {
        const cookies = await context.cookies();

        // LocalStorage 依然需要从页面上下文获取
        const localStorageData = await page.evaluate(() => {
          return JSON.stringify(window.localStorage);
        });

        profileData.cookies = cookies;
        profileData.localStorage = JSON.parse(localStorageData);
        profileData.lastActive = new Date().toISOString();

        fileUtils.writeJson(profilePath, profileData);
        console.log("💾 会话已保存");
      } catch (error) {
        console.error(`❌ 保存失败: ${error.message}`);
      }
    },

    // 简单透传，假设 navigation.js 还没迁移，这里可以暂时写简单的封装
    goto: async (url) => page.goto(url, { waitUntil: "domcontentloaded" }),
    goBack: async () => page.goBack(),
    reload: async () => page.reload({ waitUntil: "domcontentloaded" }),
  };

  return { page, context, cursor, browser, utils, profileData };
}
