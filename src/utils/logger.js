import fs from "fs-extra";

export async function captureErrorState(page, error) {
  console.error(`\n❌ [严重错误] ${error.message}`);
  const timestamp = Date.now();
  await page.screenshot({
    path: `output/screenshots/error_${timestamp}.png`,
    fullPage: true,
  });
  // 其他错误处理逻辑...
}
