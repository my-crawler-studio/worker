/**
 * @file src/actions/navigation.js
 * @description 基础导航动作封装 (Playwright 版)。
 */

/**
 * 智能跳转到指定 URL
 * @param {import("playwright").Page} page
 * @param {String} url
 * @param {Object} options
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
 * @param {import("playwright").Page} page
 */
export async function goBack(page) {
  try {
    // Playwright 的 goBack 如果无法回退会返回 null，不会抛错，但保持 try-catch 是好习惯
    await page.goBack({ waitUntil: "domcontentloaded" });
  } catch (error) {
    console.warn(`⚠️ [导航警告] 回退操作可能无效: ${error.message}`);
  }
}

/**
 * 刷新页面
 * @param {import("playwright").Page} page
 */
export async function reload(page) {
  try {
    await page.reload({ waitUntil: "domcontentloaded" });
  } catch (error) {
    console.error(`❌ 刷新失败: ${error.message}`);
  }
}