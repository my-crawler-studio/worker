/**
 * @file src/core/context.js
 * @description 上下文工厂 (大师拟人版)。
 * 核心升级：引入贝塞尔曲线鼠标轨迹 + 平滑滚动视觉追踪。
 */

import * as fileUtils from "../utils/file-system.js";
import { delay } from "../utils/helpers.js";

// === 辅助数学函数：生成贝塞尔曲线路径 ===
// 这让鼠标移动看起来像是在画弧线，而不是画直线
function generateBezierPath(start, end, steps) {
  const path = [];
  // 控制点：让曲线产生随机的“弯曲”
  // 在起点和终点之间随机找两个控制点
  const control1 = {
    x:
      start.x +
      (end.x - start.x) * (0.2 + Math.random() * 0.3) +
      (Math.random() - 0.5) * 100,
    y:
      start.y +
      (end.y - start.y) * (0.2 + Math.random() * 0.3) +
      (Math.random() - 0.5) * 100,
  };
  const control2 = {
    x:
      start.x +
      (end.x - start.x) * (0.6 + Math.random() * 0.3) +
      (Math.random() - 0.5) * 100,
    y:
      start.y +
      (end.y - start.y) * (0.6 + Math.random() * 0.3) +
      (Math.random() - 0.5) * 100,
  };

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // 三阶贝塞尔公式
    const x =
      Math.pow(1 - t, 3) * start.x +
      3 * Math.pow(1 - t, 2) * t * control1.x +
      3 * (1 - t) * Math.pow(t, 2) * control2.x +
      Math.pow(t, 3) * end.x;
    const y =
      Math.pow(1 - t, 3) * start.y +
      3 * Math.pow(1 - t, 2) * t * control1.y +
      3 * (1 - t) * Math.pow(t, 2) * control2.y +
      Math.pow(t, 3) * end.y;
    path.push({ x, y });
  }
  return path;
}

export async function buildContext(
  page,
  context,
  browser,
  profileData,
  profilePath
) {
  // ============================================================
  // 🟢 新增功能：注入鼠标可视化小红点 (调试专用)
  // ============================================================
  await page.addInitScript(() => {
    // 这是一个运行在浏览器内部的函数
    const installMouseHelper = () => {
      // 防止重复注入
      if (document.getElementById("playwright-mouse-pointer")) return;

      const box = document.createElement("div");
      box.id = "playwright-mouse-pointer";

      // 样式：半透明红点，带一点阴影，绝对置顶
      const styleElement = document.createElement("style");
      styleElement.innerHTML = `
        #playwright-mouse-pointer {
          pointer-events: none; /* 关键：透传点击，不影响脚本操作 */
          position: fixed;
          top: 0;
          left: 0;
          width: 20px;
          height: 20px;
          background: rgba(255, 0, 0, 0.6);
          border: 2px solid white;
          border-radius: 50%;
          margin: -10px 0 0 -10px; /* 居中校准 */
          padding: 0;
          transition: background .2s, border-radius .2s, border-color .2s;
          z-index: 999999;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
        }
        /* 点击时的视觉反馈 */
        #playwright-mouse-pointer.button-1 {
          background: rgba(0, 255, 0, 0.6); /* 点击变绿 */
          transform: scale(0.8);
        }
      `;
      document.head.appendChild(styleElement);
      document.body.appendChild(box);

      // 监听鼠标移动，更新红点位置
      document.addEventListener(
        "mousemove",
        (event) => {
          box.style.left = event.clientX + "px";
          box.style.top = event.clientY + "px";
        },
        true
      );

      // 监听点击，增加视觉反馈
      document.addEventListener(
        "mousedown",
        () => {
          box.classList.add("button-1");
        },
        true
      );

      document.addEventListener(
        "mouseup",
        () => {
          box.classList.remove("button-1");
        },
        true
      );
    };

    // 立即执行
    if (
      document.readyState === "complete" ||
      document.readyState === "interactive"
    ) {
      installMouseHelper();
    } else {
      document.addEventListener("DOMContentLoaded", installMouseHelper, false);
    }
  });

  // === 升级版光标模拟器 ===
  const cursor = {
    // 获取当前鼠标位置（如果没有记录，默认为 0,0）
    // 注意：Playwright 不直接提供 currentPosition，我们需要自己估算或假设
    _currentPos: { x: 0, y: 0 },

    async move(target) {
      try {
        const locator =
          typeof target === "string" ? page.locator(target).first() : target;

        // 1. 【视觉拟人】平滑滚动到元素 (不再是瞬间跳跃)
        // 使用 behavior: 'smooth' 欺骗浏览器以为是用户在滚动
        // block: 'center' 让元素处于视线舒适区
        await locator.evaluate(async (el) => {
          el.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center",
          });
        });

        // 等待滚动动画完成 (给一点随机缓冲)
        await new Promise((r) => setTimeout(r, 500 + Math.random() * 300));

        // 2. 获取目标坐标
        const box = await locator.boundingBox();
        if (!box) return;

        // 目标点：在元素中心增加随机偏移 (不要总是点正中心！)
        const targetX =
          box.x + box.width / 2 + (Math.random() - 0.5) * (box.width * 0.6);
        const targetY =
          box.y + box.height / 2 + (Math.random() - 0.5) * (box.height * 0.6);

        // 3. 【动作拟人】生成贝塞尔曲线轨迹
        // 步数越多越慢，模拟菲茨定律：距离越远，步数越多
        const distance = Math.sqrt(
          Math.pow(targetX - this._currentPos.x, 2) +
            Math.pow(targetY - this._currentPos.y, 2)
        );
        const steps = Math.min(Math.max(Math.floor(distance / 5), 10), 50); // 动态步数

        const path = generateBezierPath(
          this._currentPos,
          { x: targetX, y: targetY },
          steps
        );

        // 4. 执行移动
        for (const point of path) {
          await page.mouse.move(point.x, point.y);
          // 极短的随机停顿，模拟神经传导的微小延迟
          if (Math.random() > 0.8)
            await new Promise((r) => setTimeout(r, Math.random() * 5));
        }

        // 更新当前记录的位置
        this._currentPos = { x: targetX, y: targetY };

        // 5. 【微动作】悬停后的微调 (模拟确认点击前的犹豫)
        if (Math.random() > 0.7) {
          await page.mouse.move(
            targetX + (Math.random() - 0.5) * 2,
            targetY + (Math.random() - 0.5) * 2
          );
        }
      } catch (e) {
        console.warn(`Cursor move warning: ${e.message}`);
      }
    },

    async click(target) {
      // 先移动过去
      await this.move(target);

      const locator =
        typeof target === "string" ? page.locator(target).first() : target;
      try {
        /*
        // 这里的 delay 是 mousedown 和 mouseup 之间的间隔
        // 真实点击通常在 80ms - 200ms 之间
        await locator.click({ delay: 80 + Math.random() * 100 });
        */
        // 🟢【核心修改】原地物理点击，不仅是像人，这就是人的操作逻辑
        // 也就是：在该按的时候，直接按下去，不要再挪动位置了

        // A. 模拟按下 (MouseDown)
        await page.mouse.down();

        if (Math.random() > 0.5) {
            const { x, y } = this._currentPos;
            await page.mouse.move(x + (Math.random()-0.5), y + (Math.random()-0.5));
        }

        // B. 模拟按压停留时间 (真实人类点击会有 50ms ~ 150ms 的按压延迟)
        await new Promise((r) => setTimeout(r, 60 + Math.random() * 90));

        // C. 模拟抬起 (MouseUp)
        await page.mouse.up();
      } catch (e) {
        console.warn(`⚠️ 拟人点击失败，尝试强制点击: ${e.message}`);
        await locator.click({ force: true });
      }
    },

    async moveToRandom() {
      const vp = page.viewportSize();
      if (!vp) return;
      // 随机移动到一个看起来“无害”的地方
      const targetX = Math.random() * vp.width;
      const targetY = Math.random() * vp.height;
      await this.move({
        boundingBox: async () => ({
          x: targetX,
          y: targetY,
          width: 0,
          height: 0,
        }),
      });
    },
  };

  const utils = {
    log: (msg) => console.log(`🤖 [拟人] ${msg}`),
    delay: delay,
    saveSession: async () => {
      try {
        const storageState = await context.storageState();
        profileData.storageState = storageState;
        delete profileData.cookies;
        delete profileData.localStorage;
        profileData.lastActive = new Date().toISOString();
        fileUtils.writeJson(profilePath, profileData);
        console.log("💾 完整会话状态 (StorageState) 已保存");
      } catch (error) {
        console.error(`❌ 保存会话失败: ${error.message}`);
      }
    },
    goto: async (url) => page.goto(url, { waitUntil: "domcontentloaded" }),
    goBack: async () => page.goBack({ waitUntil: "domcontentloaded" }),
    reload: async () => page.reload({ waitUntil: "domcontentloaded" }),
  };

  return { page, context, cursor, browser, utils, profileData };
}
