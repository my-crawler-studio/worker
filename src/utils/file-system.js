/**
 * @file src/utils/file-system.js
 * @description 文件系统操作工具集。
 * 基于 fs-extra 封装，处理文件读写、目录创建及 JSON 序列化。
 * @module Utils/FileSystem
 */

import fs from "fs-extra";
import path from "path";

/**
 * 确保目录存在，不存在则创建
 * @param {String} dirPath
 */
export function ensureDir(dirPath) {
  fs.ensureDirSync(dirPath);
}

/**
 * 读取 JSON 文件
 * @param {String} filePath
 * @returns {Object|null}
 */
export function readJson(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readJsonSync(filePath);
    }
  } catch (error) {
    console.error(`❌ 读取 JSON 失败: ${filePath}`, error);
  }
  return null;
}

/**
 * 写入 JSON 文件 (自动美化)
 * @param {String} filePath
 * @param {Object} data
 */
export function writeJson(filePath, data) {
  try {
    fs.ensureDirSync(path.dirname(filePath));
    fs.writeJsonSync(filePath, data, { spaces: 2 });
  } catch (error) {
    console.error(`❌ 写入 JSON 失败: ${filePath}`, error);
  }
}

/**
 * 检查文件是否存在
 * @param {String} filePath
 * @returns {Boolean}
 */
export function exists(filePath) {
  return fs.existsSync(filePath);
}
