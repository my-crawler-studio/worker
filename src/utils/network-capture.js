/**
 * @file src/utils/network-capture.js
 * @description 网络响应拦截与转储工具 (Playwright 版)。
 * 负责监听 Page 的 response 事件，筛选 Document/XHR/Fetch 并保存。
 */

import path from "path";
import fs from "fs-extra";
import md5 from "md5";

/**
 * 启动网络抓取监听器
 * @param {import("playwright").Page} page - Playwright Page 实例
 * @param {String} saveDir - 保存目录
 */
export function setupNetworkCapture(page, saveDir) {
  // 监听 response 事件
  page.on("response", async (response) => {
    try {
      const url = response.url();
      const status = response.status();

      // 1. 状态码过滤
      if (status !== 200) return;

      // 2. 资源类型过滤
      const request = response.request();
      const resourceType = request.resourceType();
      
      // Playwright 的 resourceType 也是返回 'document', 'xhr', 'fetch' 等
      if (!["document", "xhr", "fetch"].includes(resourceType)) return;

      // === [Playwright 变更点] ===
      // 使用 .body() 获取 buffer，而不是 .buffer()
      const buffer = await response.body();

      // 3. 构建文件名 (保持原逻辑)
      const urlParts = url.split("/");
      let nameHint = urlParts[urlParts.length - 1] || "index";
      nameHint = nameHint.replace(/[^a-zA-Z0-9.-]/g, "_").substring(0, 30);
      const hash = md5(url).substring(0, 8);
      const fileName = `${resourceType}_${hash}_${nameHint}`;
      const filePath = path.join(saveDir, fileName);

      // 4. 写入文件
      await fs.writeFile(filePath, buffer);
    } catch (err) {
      // 忽略因页面跳转导致 context 销毁引起的报错
    }
  });
}