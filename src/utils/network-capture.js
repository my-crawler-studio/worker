/**
 * @file src/utils/network-capture.js
 * @description 网络响应拦截与转储工具。
 * 负责监听 Puppeteer Page 的 response 事件，筛选 Document/XHR/Fetch 并保存到本地 dumps 目录。
 * @module Utils/NetworkCapture
 */

import path from "path";
import fs from "fs-extra";
import md5 from "md5";

/**
 * 启动网络抓取监听器
 * 将符合条件的响应体 (Response Body) 写入指定目录
 *
 * @param {import("puppeteer").Page} page - Puppeteer Page 实例
 * @param {String} saveDir - 转储文件的保存目录 (绝对路径)
 */
export function setupNetworkCapture(page, saveDir) {
  // 监听 response 事件
  page.on("response", async (response) => {
    const url = response.url();

    // 1. 状态码过滤：非 200 状态跳过
    if (response.status() !== 200) return;

    // 2. 资源类型过滤：只保存 document, xhr, fetch
    const resourceType = response.request().resourceType();
    if (!["document", "xhr", "fetch"].includes(resourceType)) return;

    try {
      // 获取响应 buffer
      const buffer = await response.buffer();

      // 3. 构建文件名 (完全保留原逻辑)
      // 提取 URL 最后一部分作为名字提示
      const urlParts = url.split("/");
      let nameHint = urlParts[urlParts.length - 1] || "index";

      // 正则清理非法字符，并限制长度为 30
      nameHint = nameHint.replace(/[^a-zA-Z0-9.-]/g, "_").substring(0, 30);

      // 计算 URL 的 MD5 哈希截取前8位，防止文件名冲突
      const hash = md5(url).substring(0, 8);

      // 组合最终文件名: 类型_哈希_提示名
      const fileName = `${resourceType}_${hash}_${nameHint}`;
      const filePath = path.join(saveDir, fileName);

      // 4. 写入文件
      await fs.writeFile(filePath, buffer);
    } catch (err) {
      // 忽略 buffer 获取失败、空响应或重定向过程中的错误
      // 保持静默失败，避免刷屏报错影响主流程
    }
  });
}
