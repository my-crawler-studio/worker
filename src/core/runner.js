/**
 * @file src/core/runner.js
 * @description 任务运行器。
 * 更新：增强登录模式，支持手动输入验证链接进行跳转。
 */

import readline from "readline-sync";

export async function startInteractiveLoop(ctx, strategies, profiles) {
  const profileKeys = Object.keys(profiles);
  const strategyKeys = Object.keys(strategies);

  let lastProfileKey = profileKeys.includes("shopee")
    ? "shopee"
    : profileKeys[0];
  let lastStrategyKey = strategyKeys[0];

  console.log("\n==================================================");
  console.log(`✅ 系统就绪`);
  console.log(`   可选站点: [${profileKeys.join(", ")}]`);
  console.log(`   可选策略: [${strategyKeys.join(", ")}]`);
  console.log("--------------------------------------------------");
  console.log("👉 输入 'r' : 运行策略 (Run)");
  console.log("👉 输入 'l' : 手动登录 (Login) <--- 支持邮件链接跳转");
  console.log("👉 输入 'q' : 退出 (Quit)");
  console.log("==================================================\n");

  let isRunning = true;
  while (isRunning) {
    const command = readline.question("Command (r/l/q) > ").toLowerCase();

    switch (command) {
      case "r":
        // ... (省略选择 Profile/Strategy 的输入部分，保持原样) ...
        const pInput = readline
          .question(
            `Select Profile [${profileKeys.join(
              "/"
            )}] (default: ${lastProfileKey}): `
          )
          .trim();
        const pKey = pInput || lastProfileKey;
        if (!profiles[pKey]) {
          console.log(`❌ 找不到 Profile: ${pKey}`);
          break;
        }

        const sInput = readline
          .question(
            `Select Strategy [${strategyKeys.join(
              "/"
            )}] (default: ${lastStrategyKey}): `
          )
          .trim();
        const sKey = sInput || lastStrategyKey;
        if (!strategies[sKey]) {
          console.log(`❌ 找不到 Strategy: ${sKey}`);
          break;
        }

        lastProfileKey = pKey;
        lastStrategyKey = sKey;

        console.log(`\n▶️  [${pKey}] :: [${sKey}] 正在启动...`);
        try {
          const profile = profiles[pKey];
          const strategy = strategies[sKey];

          // === [新增] 关键步骤：注入 LocalStorage ===
          if (ctx.profileData.localStorage) {
            console.log("⚡️ 检测到 LocalStorage 数据，正在恢复...");

            // 1. 必须先到达目标域名，才能操作 LS
            // 只有当前 url 不是目标域名时才跳转，避免重复刷新
            if (!ctx.page.url().includes(profile.baseUrl)) {
              await ctx.page.goto(profile.baseUrl, {
                waitUntil: "domcontentloaded",
              });
            }

            // 2. 注入数据
            await ctx.page.evaluate((data) => {
              localStorage.clear();
              for (const key in data) {
                localStorage.setItem(key, data[key]);
              }
            }, ctx.profileData.localStorage);

            console.log("✅ LocalStorage 恢复完成，刷新页面生效...");
            await ctx.page.reload({ waitUntil: "domcontentloaded" });
          }
          // ==========================================

          if (
            strategy.SUPPORTED_TYPES &&
            !strategy.SUPPORTED_TYPES.includes(profile.type)
          ) {
            throw new Error(
              `类型不匹配: 策略需要 [${strategy.SUPPORTED_TYPES}] 但 Profile 是 '${profile.type}'`
            );
          }
          await strategy.run(ctx, profile);
        } catch (error) {
          console.error(`⚠️ 任务执行失败: ${error.message}`);
        }
        console.log("✅ 任务结束\n");
        break;

      case "l":
        // === 手动登录逻辑 (增强版) ===
        console.log("\n🔑 [手动登录模式]");
        const loginProfileKey = readline
          .question(`选择要登录的站点 [${profileKeys.join("/")}]: `)
          .trim();
        const targetProfile = profiles[loginProfileKey];
        if (!targetProfile) break;

        try {
          console.log(`1. 跳转到 ${targetProfile.name}...`);
          await ctx.page.goto(targetProfile.baseUrl, {
            waitUntil: "domcontentloaded",
          });

          console.log(
            "----------------------------------------------------------------"
          );
          console.log("   🛠  常用指令：");
          console.log("      - 粘贴 http链接 : 跳转验证链接");
          console.log("      - 输入 'home'   : 强制回首页 (解决页面卡死转圈)");
          console.log("      - 直接 [Enter]  : 登录完成，保存状态");
          console.log(
            "----------------------------------------------------------------"
          );

          let loggingIn = true;
          while (loggingIn) {
            const input = readline.question("\n(登录中) > ").trim();

            if (!input) {
              loggingIn = false; // 回车保存
            } else if (input === "home") {
              // [新增] 解决卡死问题
              console.log("🏠 正在强制跳转回首页...");
              await ctx.page.goto(targetProfile.baseUrl, {
                waitUntil: "domcontentloaded",
              });
              console.log("✅ 已回到首页，请检查是否已登录。");
            } else if (input.startsWith("http")) {
              console.log(`🔗 跳转验证链接...`);
              try {
                await ctx.page.goto(input, { waitUntil: "domcontentloaded" });
              } catch (e) {
                console.error(`跳转失败: ${e.message}`);
              }
            } else {
              console.log("⚠️ 无效指令");
            }
          }

          console.log("💾 正在保存完整会话 (Cookie + LS)...");
          await ctx.utils.saveSession(); // 调用新的保存方法
          console.log(`🎉 保存成功！请按 'r' 运行任务。`);
        } catch (err) {
          console.error(`❌ 出错: ${err.message}`);
        }
        console.log("");
        break;

      case "q":
        console.log("Pw [系统] 正在关闭...");
        isRunning = false;
        break;

      default:
        console.log("❓ 未知命令");
    }
  }
}
