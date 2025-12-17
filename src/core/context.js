/**
 * @file src/core/context.js
 * @description 上下文工厂。
 * 升级：saveSession 支持保存 LocalStorage，解决 Shopee 反复登录问题。
 */

import { createCursor } from "ghost-cursor";
import * as fileUtils from "../utils/file-system.js";
import { delay } from "../utils/helpers.js";
import * as nav from "../actions/navigation.js";

export function buildContext(page, browser, profileData, profilePath) {
  const cursor = createCursor(page);

  const utils = {
    log: (msg) => console.log(`🤖 [拟人] ${msg}`),
    delay: delay,

    // [升级] 保存完整会话 (Cookie + LocalStorage)
    saveSession: async () => {
      // 1. 获取 Cookies
      const cookies = await page.cookies();
      
      // 2. 获取 LocalStorage (需要在浏览器环境执行)
      const localStorageData = await page.evaluate(() => {
        return JSON.stringify(window.localStorage);
      });

      // 3. 更新数据
      profileData.cookies = cookies;
      profileData.localStorage = JSON.parse(localStorageData); // 存为对象
      profileData.lastActive = new Date().toISOString();

      // 4. 写入文件
      fileUtils.writeJson(profilePath, profileData);
      console.log("💾 会话状态 (Cookies + LocalStorage) 已保存");
    },

    goto: (url, options) => nav.goto(page, url, options),
    goBack: () => nav.goBack(page),
    reload: () => nav.reload(page),
  };

  return { page, cursor, browser, utils, profileData };
}