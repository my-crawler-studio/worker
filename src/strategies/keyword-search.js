/**
 * @file src/strategies/keyword-search.js
 * @description 通用搜索浏览策略 (Playwright 适配版 - 简化后)。
 * 得益于 Context 中的 CursorAdapter，这里可以直接传入 Locator。
 */

import {
  humanHover,
  humanScroll,
  executeHumanReadingStrategy,
} from "../actions/human-behavior.js";
import { getRandomProductKeyword } from "../utils/keywords.js";
import { captureErrorState } from "../utils/logger.js";

export const SUPPORTED_TYPES = ["search"];

export async function run(ctx, profile) {
  const { page, cursor, utils } = ctx;
  const { log, delay } = utils;

  if (!SUPPORTED_TYPES.includes(profile.type)) {
    throw new Error(`类型不匹配: ${profile.type}`);
  }

  const { selectors } = profile;

  try {
    const SEARCH_KEYWORD = getRandomProductKeyword();
    const BROWSE_COUNT = 3;

    // 1. 进入主页
    if (!page.url().includes(profile.domains[0])) {
      log(`进入主页: ${profile.baseUrl}`);
      await page.goto(profile.baseUrl, { waitUntil: "domcontentloaded" });
    }

    // 2. 搜索逻辑
    if (await page.isVisible(selectors.searchInput)) {
      log("准备搜索...");
      await humanHover(cursor, page, selectors.navItems);

      // === [关键] 直接调用 cursor.click(selector) ===
      // Adapter 会自动处理坐标转换，不会报错
      await cursor.click(selectors.searchInput);
      
      // 清空并输入
      await page.locator(selectors.searchInput).clear(); // Playwright 原生 clear
      
      log(`正在输入: ${SEARCH_KEYWORD}`);
      await page.locator(selectors.searchInput).pressSequentially(SEARCH_KEYWORD, {
        delay: 100 + Math.random() * 100,
      });
      
      await delay(500, 1000);
      await page.keyboard.press("Enter");
      await page.waitForLoadState('domcontentloaded');
    }

    // 3. 商品浏览
    for (let i = 0; i < BROWSE_COUNT; i++) {
      // 获取 Locator 列表
      let cards = await page.locator(selectors.resultCard).all();

      // 简单滚动加载逻辑
      if (cards.length <= i) {
        log(`⏳ 滚动加载...`);
        await page.mouse.wheel(0, 1000);
        await delay(2000, 3000);
        cards = await page.locator(selectors.resultCard).all();
      }

      if (cards.length <= i) break;
      const currentCard = cards[i];

      // 寻找链接 (优先标题)
      let targetItem = currentCard.locator(selectors.titleLink).first();
      if (!(await targetItem.count())) {
        if (selectors.imageLink) targetItem = currentCard.locator(selectors.imageLink).first();
      }

      if (!(await targetItem.count())) continue;

      // === [关键] 直接调用 cursor.click(Locator) ===
      // 我们把 Playwright Locator 传进去，Adapter 会搞定 boundingBox
      log("点击商品...");
      try {
          await cursor.click(targetItem);
      } catch (err) {
          log(`⚠️ 拟人点击失败 (${err.message})，尝试原生点击`);
          await targetItem.click(); // 兜底
      }

      // 等待详情页
      try {
        await page.waitForSelector(selectors.productDetailTitle, { timeout: 8000, state: 'visible' });
      } catch (e) {
        log("加载稍慢，继续阅读...");
      }

      // 阅读行为
      await executeHumanReadingStrategy(ctx, selectors.detailHoverTargets);

      // 返回
      await page.goBack({ waitUntil: "domcontentloaded" });
      await humanScroll(page, 1);
    }

    if (utils.saveSession) await utils.saveSession();
    log("✅ 任务完成");

  } catch (error) {
    await captureErrorState(page, error);
  }
}