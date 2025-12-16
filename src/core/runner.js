/**
 * @file src/core/runner.js
 * @description 任务运行器。
 * 负责：命令行交互循环、策略调度与执行。
 */

import readline from "readline-sync";

/**
 * 启动交互式任务循环
 * @param {Object} ctx - 执行上下文
 * @param {Object} strategy - 当前加载的策略
 * @param {Object} profile - 当前加载的站点配置
 */
export async function startInteractiveLoop(ctx, strategy, profile) {
  console.log("\n==================================================");
  console.log(
    `✅ 系统就绪 - 目标站点: ${profile.name} [Type: ${profile.type}]`
  );
  console.log(
    `🧩 加载策略: KeywordSearch (支持: ${strategy.SUPPORTED_TYPES.join(", ")})`
  );
  console.log("👉 输入 'r' : 执行策略");
  console.log("👉 输入 'q' : 退出程序");
  console.log("==================================================\n");

  let isRunning = true;
  while (isRunning) {
    const command = readline.question("Command (r/q) > ").toLowerCase();

    switch (command) {
      case "r":
        console.log("▶️  开始执行策略...");
        try {
          // 执行策略
          await strategy.run(ctx, profile);
        } catch (error) {
          console.error(`⚠️ 策略执行异常: ${error.message}`);
        }
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
