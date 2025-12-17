/**
 * @file src/core/runner.js
 * @description 任务运行器 (极简版)。
 * 移除所有手动状态注入代码，完全依赖 Context 的原生 StorageState。
 */

import readline from "readline-sync";

export async function startInteractiveLoop(ctx, strategies, profiles) {
  const profileKeys = Object.keys(profiles);
  const strategyKeys = Object.keys(strategies);

  let lastProfileKey = profileKeys.includes("shopee")
    ? "shopee"
    : profileKeys[0] || "default";
  let lastStrategyKey = strategyKeys[0] || "default";

  console.log("\n=== Playwright Native Engine ===");
  console.log(`Commands: [r] Run, [l] Login, [q] Quit`);

  let isRunning = true;
  while (isRunning) {
    const command = readline.question("Command > ").toLowerCase();

    switch (command) {
      case "r":
        const pInput = readline
          .question(`Profile [${lastProfileKey}]: `)
          .trim();
        const pKey = pInput || lastProfileKey;
        if (!profiles[pKey]) {
          console.log("❌ Invalid Profile");
          break;
        }

        const sInput = readline
          .question(`Strategy [${lastStrategyKey}]: `)
          .trim();
        const sKey = sInput || lastStrategyKey;
        if (!strategies[sKey]) {
          console.log("❌ Invalid Strategy");
          break;
        }

        lastProfileKey = pKey;
        lastStrategyKey = sKey;

        console.log(`\n▶️  [${pKey}] :: [${sKey}] 启动...`);
        try {
          const profile = profiles[pKey];
          const strategy = strategies[sKey];

          // === [已移除] 所有的 LocalStorage 手动注入逻辑 ===
          // Playwright 已经在 Context 创建时注入了数据。
          // 只需要直接访问页面，数据就是存在的。

          await strategy.run(ctx, profile);
        } catch (error) {
          console.error(`⚠️ 执行出错: ${error.message}`);
          console.error(error);
        }
        console.log("✅ 任务结束\n");
        break;

      case "l":
        console.log("\n🔑 手动登录模式");
        const loginKey = readline
          .question(`站点 [${profileKeys.join("/")}]: `)
          .trim();
        const target = profiles[loginKey];
        if (!target) break;

        try {
          // 直接前往，无需注入
          await ctx.page.goto(target.baseUrl, {
            waitUntil: "domcontentloaded",
          });

          console.log("👉 请操作登录...");
          console.log("👉 输入 'ok' 保存并退出");

          let logging = true;
          while (logging) {
            const inp = readline.question("Login > ");
            if (inp === "ok" || inp === "") {
              logging = false;
            } else if (inp.startsWith("http")) {
              try {
                // 1. 获取当前浏览器上下文
                const context = ctx.page.context();

                // 2. 创建一个新的页面 (相当于 Ctrl+T)
                const newPage = await context.newPage();

                // 3. 在新页面打开验证链接
                await newPage.goto(inp, { waitUntil: "domcontentloaded" });

                console.log("✅ 验证链接已打开");
                console.log("👀 请观察原登录页面是否自动跳转...");

                // 可选：为了更像人，可以稍作停留后关闭新页面，或者留着不关闭
                // 如果你想自动关闭验证页：
                // setTimeout(async () => { try { await newPage.close(); } catch {} }, 5000);
              } catch (e) {
                console.error("⚠️ 打开新标签页失败:", e.message);
              }
            }
          }

          // 这里会调用新的 saveSession，保存原生 storageState
          await ctx.utils.saveSession();
          console.log("🎉 状态已更新");
        } catch (e) {
          console.error(e);
        }
        break;

      case "q":
        isRunning = false;
        break;

      default:
        console.log("❓ 未知命令");
    }
  }
}
