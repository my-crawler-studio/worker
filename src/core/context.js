/**
 * @file src/core/context.js
 * @description 上下文工厂，负责组装 Page 对象、GhostCursor 以及通用工具函数。
 * @module Core/Context
 */

import { createCursor } from "ghost-cursor";
import * as fileUtils from "../utils/file-system.js";
import { delay } from "../utils/helpers.js";

/**
 * 构建执行上下文
 * @param {Object} page - Puppeteer Page 对象
 * @param {Object} browser - Puppeteer Browser 对象
 * @param {Object} profileData - 当前加载的账号数据
 * @param {String} profilePath - 账号数据文件路径
 * @returns {Object} 上下文对象 ctx
 */
export function buildContext(page, browser, profileData, profilePath) {
  const cursor = createCursor(page);

  // 注入通用工具到上下文，策略层直接调用 ctx.utils.xxx
  const utils = {
    log: (msg) => console.log(`🤖 [拟人] ${msg}`),
    delay: delay,
    saveCookies: async () => {
      profileData.cookies = await page.cookies();
      profileData.lastActive = new Date().toISOString();
      fileUtils.writeJson(profilePath, profileData);
      console.log("💾 Cookies 已保存");
    },
  };

  return { page, cursor, browser, utils, profileData };
}
