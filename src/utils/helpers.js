/**
 * @file src/utils/helpers.js
 * @description 通用辅助函数库。
 * 包含随机延时、时间戳格式化等不依赖 Puppeteer 的纯逻辑函数。
 * @module Utils/Helpers
 */

/**
 * 随机延迟函数 (拟人核心)
 * 生成一个 min 到 max 之间的随机时间进行等待
 * @param {Number} min - 最小等待毫秒数
 * @param {Number} max - 最大等待毫秒数
 * @returns {Promise<void>}
 */
export const delay = (min, max) => {
  // 逻辑保持原样：基于 Math.random 的区间算法
  const time = min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, time));
};

/**
 * 获取格式化的时间戳字符串
 * 格式: YYYY-MM-DD_HH-mm-ss
 * 用于生成 Session 目录名
 * @returns {String}
 */
export function getFormattedTimestamp() {
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, "0");

  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());

  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

/**
 * 简单的哈希生成 (用于文件名)
 * @param {String} str
 * @returns {String} 简短的 Hash
 */
export function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).substring(0, 8);
}
