/**
 * @file src/strategies/keyword-search.js
 * @description 通用搜索浏览策略 (Search -> List -> Detail -> Back)。
 * 支持多平台配置 (Amazon, Alibaba等)。
 */

import {
  humanHover,
  humanScroll,
  executeHumanReadingStrategy,
} from "../actions/human-behavior.js";
import { getRandomProductKeyword } from "../utils/keywords.js";
import { captureErrorState } from "../utils/logger.js";

/**
 * 执行搜索与浏览策略
 * @param {Object} ctx - 核心上下文 (page, cursor, utils)
 * @param {Object} profile - 目标网站的 Profile 配置 (包含 selectors)
 */
export async function run(ctx, profile) {
  const { page, cursor, utils } = ctx;
  const { log, delay } = utils;
  const { selectors } = profile; // 解构获取当前网站的选择器

  try {
    const SEARCH_KEYWORD = getRandomProductKeyword();
    const BROWSE_COUNT = 3;

    // === 1. 检查并进入主页 ===
    if (!page.url().includes(profile.domains[0])) {
      log(`进入主页: ${profile.baseUrl}`);
      await page.goto(profile.baseUrl, { waitUntil: "domcontentloaded" });
    }

    // === 2. 拟人化搜索 ===
    if (await page.$(selectors.searchInput)) {
      log("准备搜索...");
      await humanHover(cursor, page, selectors.navItems);

      await cursor.click(selectors.searchInput);
      await page.evaluate(
        (s) => (document.querySelector(s).value = ""),
        selectors.searchInput
      );

      log(`正在输入: ${SEARCH_KEYWORD}`);
      await page.type(selectors.searchInput, SEARCH_KEYWORD, {
        delay: 100 + Math.random() * 100,
      });
      await delay(500, 1000);
      await page.keyboard.press("Enter");
      await page.waitForNavigation({ waitUntil: "domcontentloaded" });
    }

    // === 3. 循环浏览商品 ===
    for (let i = 0; i < BROWSE_COUNT; i++) {
      let cards = await page.$$(selectors.resultCard);

      // 懒加载滚动逻辑
      let scrollAttempts = 0;
      while (cards.length <= i && scrollAttempts < 3) {
        log(`⏳ 寻找第 ${i + 1} 个商品，尝试滚动...`);
        await page.evaluate(() =>
          window.scrollBy({ top: window.innerHeight * 1.5, behavior: "smooth" })
        );
        await delay(2000, 3000);
        cards = await page.$$(selectors.resultCard);
        scrollAttempts++;
      }

      if (cards.length <= i) break;

      const currentCard = cards[i];

      // 验证是否为有效商品 (使用 Profile 中的规则)
      if (selectors.asinAttribute) {
        const attrVal = await currentCard.evaluate(
          (el, attr) => el.getAttribute(attr),
          selectors.asinAttribute
        );
        if (!attrVal || attrVal.trim() === "") {
          log(`⚠️ 跳过索引 ${i}: 非商品组件`);
          continue;
        }
      }

      // 寻找链接
      let targetItem = await currentCard.$(selectors.titleLink);
      if (!targetItem && selectors.imageLink) {
        targetItem = await currentCard.$(selectors.imageLink);
      }

      if (!targetItem) continue;

      // 移动并点击
      await targetItem.scrollIntoView();
      await page.evaluate(() =>
        window.scrollBy({ top: -100, behavior: "smooth" })
      );
      await delay(1000, 2000);

      log("点击进入详情页...");
      await cursor.click(targetItem);

      try {
        await page.waitForSelector(selectors.productDetailTitle, {
          timeout: 10000,
        });
      } catch (e) {
        log("页面加载慢，继续尝试阅读...");
      }

      // === 4. 执行通用阅读动作 ===
      // 传入当前网站配置的悬停目标
      await executeHumanReadingStrategy(ctx, selectors.detailHoverTargets);

      log("🔙 准备返回列表...");
      await page.goBack({ waitUntil: "domcontentloaded" });

      log("🤔 寻找下一个目标...");
      await humanScroll(page, 1);
      await delay(2000, 4000);
    }

    await utils.saveCookies();
    log("✅ 任务流程结束");
  } catch (error) {
    await captureErrorState(page, error);
  }
}
