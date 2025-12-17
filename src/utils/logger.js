/**
 * @file src/utils/logger.js
 * @description 日志与错误截图工具 (Playwright 版)。
 */

import fs from "fs-extra";
import path from "path";

export async function captureErrorState(page, error) {
  console.error(`\n❌ [严重错误] ${error.message}`);
  
  try {
    const timestamp = Date.now();
    const screenshotPath = path.join("output", "screenshots", `error_${timestamp}.png`);
    
    // 确保目录存在
    await fs.ensureDir(path.dirname(screenshotPath));

    // Playwright 截图 API
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });
    console.log(`📸 错误截图已保存: ${screenshotPath}`);
  } catch (snapError) {
    console.error("⚠️ 截图失败:", snapError.message);
  }
}