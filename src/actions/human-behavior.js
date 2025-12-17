/**
 * @file src/actions/human-behavior.js
 * @description 核心拟人化行为库 (Playwright 版)。
 * 升级：使用 Playwright 原生 isVisible 替代 $eval 检查，提升稳定性。
 */

/**
 * 策略 A + B: 深度阅读模式
 * @param {Object} ctx - 执行上下文
 * @param {Array<String>} hoverSelectors - 页面内用于随机悬停的选择器列表
 */
export async function executeHumanReadingStrategy(ctx, hoverSelectors) {
  const { page, cursor, utils } = ctx;
  const { log, delay } = utils;

  log("📖 [开始阅读] 模拟真实用户浏览行为...");

  // 1. 初始视觉扫描
  await humanHover(cursor, page, hoverSelectors);

  // 2. 深度阅读滚动
  log("📜 [滚动] 开始阅读详情...");
  // evaluate 内部逻辑是纯浏览器 JS，Playwright 与 Puppeteer 通用
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    // 第一段：快速浏览概况
    window.scrollBy({ top: 400, behavior: "smooth" });
    await sleep(1000 + Math.random() * 500);

    // 第二段：查看详细参数 (慢速)
    window.scrollBy({ top: 300, behavior: "smooth" });
    await sleep(2000 + Math.random() * 1000);

    // 第三段：拟人化回滚
    if (Math.random() > 0.3) {
      window.scrollBy({ top: -250, behavior: "smooth" });
      await sleep(1500);
    }

    // 第四段：查看评论
    window.scrollBy({ top: 800, behavior: "smooth" });
  });

  await delay(5000, 7000);

  // 3. 再次视觉扫描
  await humanHover(cursor, page, hoverSelectors);

  log("📖 [结束阅读] 准备离开...");
  await delay(1000, 2000);
}

/**
 * 随机悬停 (适配 Playwright)
 */
export async function humanHover(cursor, page, selectors) {
  if (!selectors || selectors.length === 0) return;
  const shuffled = selectors.sort(() => 0.5 - Math.random());

  for (const selector of shuffled) {
    if (Math.random() > 0.5) continue;
    try {
      const isVisible = await page.isVisible(selector).catch(() => false);
      if (isVisible) {
        // === 这里现在安全了 ===
        // CursorAdapter.move 会接收这个 selector 字符串
        // 并自动计算 Playwright 的 coordinates
        await cursor.move(selector);
        
        await new Promise((r) => setTimeout(r, 500 + Math.random() * 1200));
      }
    } catch (e) { /* ignore */ }
  }
}

/**
 * 列表滚动 (纯浏览器操作，无需修改)
 */
export async function humanScroll(page, steps = 2) {
  await page.evaluate(async (count) => {
    for (let i = 0; i < count; i++) {
      window.scrollBy({ top: 300 + Math.random() * 200, behavior: "smooth" });
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 500));
    }
  }, steps);
}