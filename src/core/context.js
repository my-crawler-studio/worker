/**
 * @file src/core/context.js
 * @description 上下文工厂，负责组装 Page 对象、GhostCursor 以及通用工具函数。
 * @module Core/Context
 */

import { createCursor } from "ghost-cursor";
import * as fileUtils from "../utils/file-system.js";
import { delay } from "../utils/helpers.js";
import * as nav from "../actions/navigation.js"; // [引用新增]

export function buildContext(page, browser, profileData, profilePath) {
  const cursor = createCursor(page);

  // 注入通用工具到上下文
  const utils = {
    log: (msg) => console.log(`🤖 [拟人] ${msg}`),
    delay: delay,
    saveCookies: async () => {
      profileData.cookies = await page.cookies();
      profileData.lastActive = new Date().toISOString();
      fileUtils.writeJson(profilePath, profileData);
      console.log("💾 Cookies 已保存");
    },
    // [新增] 导航工具集成
    goto: (url, options) => nav.goto(page, url, options),
    goBack: () => nav.goBack(page),
    reload: () => nav.reload(page),
  };

  return { page, cursor, browser, utils, profileData };
}