/**
 * @file src/actions/navigation.js
 * @description 基础导航动作封装。
 * 统一管理页面的跳转、回退以及等待逻辑。
 * @module Actions/Navigation
 */

/**
 * 智能跳转到指定 URL
 * @param {Object} page - Puppeteer Page 对象
 * @param {String} url - 目标地址
 * @param {Object} options - 跳转选项
 */
export async function goto(page, url, options = {}) {
  const defaultOptions = {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  };
  try {
    await page.goto(url, { ...defaultOptions, ...options });
  } catch (error) {
    console.error(`❌ [导航失败] 无法前往 ${url}: ${error.message}`);
    throw error;
  }
}

/**
 * 拟人化回退
 * @param {Object} page - Puppeteer Page 对象
 */
export async function goBack(page) {
  try {
    await page.goBack({ waitUntil: "domcontentloaded" });
  } catch (error) {
    console.warn(
      `⚠️ [导航警告] 回退操作失败 (可能是因为已经在第一页): ${error.message}`
    );
  }
}

/**
 * 刷新页面
 * @param {Object} page
 */
export async function reload(page) {
  await page.reload({ waitUntil: "domcontentloaded" });
}
