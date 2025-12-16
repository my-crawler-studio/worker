// tasks/logic.js

import fs from "fs-extra"; // 确保引入 fs，如果没有请在 index.js 传入或在此处引入

/**
 * 严谨的拟人化脚本
 * 包含：随机悬停(Hover Intent)、变速滚动(Scroll Dynamics)、犹豫点击、回退浏览
 */
export async function run(ctx) {
  const { page, cursor, utils } = ctx;
  const { log, delay } = utils;

  try {
    // 核心参数
    const SEARCH_KEYWORD = getRandomProductKeyword();
    const BROWSE_COUNT = 3; // 浏览几个商品

    // === 1. 检查并进入主页 ===
    if (!page.url().includes("amazon.com")) {
      log("进入主页...");
      await page.goto("https://www.amazon.com/", {
        waitUntil: "domcontentloaded",
      });
    }

    // === 2. 拟人化搜索 (策略 C: 模拟点击与输入) ===
    const searchInputSelector = "#twotabsearchtextbox";
    if (await page.$(searchInputSelector)) {
      log("准备搜索...");

      // 随机悬停一下导航栏，模拟“找搜索框”的过程
      await humanHover(cursor, page, ["#nav-xshop a", "#nav-logo-sprites"]);

      // 点击搜索框
      await cursor.click(searchInputSelector);

      // 模拟清空（如果已有文字）
      await page.evaluate(
        (s) => (document.querySelector(s).value = ""),
        searchInputSelector
      );

      // 拟人打字：每个按键间隔随机，模拟真实的打字节奏
      log(`正在输入: ${SEARCH_KEYWORD}`);
      await page.type(searchInputSelector, SEARCH_KEYWORD, {
        delay: 100 + Math.random() * 100,
      });

      await delay(500, 1000); // 打完字停顿一下，确认无误
      await page.keyboard.press("Enter");

      await page.waitForNavigation({ waitUntil: "domcontentloaded" });
      log("搜索结果加载完毕");
    }

    // === 3. 循环浏览商品 (Search -> Click -> Read -> Back) ===
    for (let i = 0; i < BROWSE_COUNT; i++) {
      const cardSelector = 'div[data-component-type="s-search-result"]';

      let cards = await page.$$(cardSelector);

      // --- 懒加载防御 (同上一步，保留滚动逻辑) ---
      let scrollAttempts = 0;
      while (cards.length <= i && scrollAttempts < 3) {
        log(
          `⏳ 正在寻找第 ${i + 1} 个商品 (当前已加载: ${
            cards.length
          })，尝试滚动...`
        );
        await page.evaluate(() =>
          window.scrollBy({ top: window.innerHeight * 1.5, behavior: "smooth" })
        );
        await delay(2000, 3000);
        cards = await page.$$(cardSelector);
        scrollAttempts++;
      }

      if (cards.length <= i) {
        log("⚠️ 已滚动到底部，没有更多商品了");
        break;
      }

      const currentCard = cards[i];

      // 2. [核心修改] 验证 ASIN (Amazon Standard Identification Number)
      // 只有带有 ASIN 的才是真正的商品，头部广告或Widget通常 ASIN 为空
      const asin = await currentCard.evaluate((el) =>
        el.getAttribute("data-asin")
      );

      if (!asin || asin.trim() === "") {
        log(`⚠️ 跳过索引 ${i}: 检测到非商品组件 (Header/Widget)`);
        continue;
      }

      // 3. [多重保险] 寻找可点击的链接
      // 策略：优先找标题链接 (h2 a)，如果找不到（某些广告位结构不同），则找图片链接
      let targetItem = await currentCard.$("h2 a");

      if (!targetItem) {
        // Fallback: 尝试寻找图片链接 (针对结构变异的商品)
        targetItem = await currentCard.$(".s-product-image-container a");
      }

      if (!targetItem) {
        log(`⚠️ 跳过索引 ${i} (ASIN: ${asin}): 无法找到可点击的链接`);
        continue;
      }
      // 3.1 移动到目标商品
      log("正在寻找目标商品...");
      // 先稍微滚过头一点，再滚回来（极度拟人）
      await targetItem.scrollIntoView();
      await page.evaluate(() =>
        window.scrollBy({ top: -100, behavior: "smooth" })
      );
      await delay(1000, 2000); // 视觉确认

      // 3.2 犹豫点击
      // 只有机器人会直接点正中心。Ghost Cursor 会自动产生随机偏移和曲线
      log("点击进入详情页...");
      await cursor.click(targetItem);

      // 等待详情页关键元素加载
      try {
        await page.waitForSelector("#productTitle", { timeout: 10000 });
      } catch (e) {
        log("页面加载慢，继续尝试阅读...");
      }

      // === 4. 在详情页执行核心拟人策略 (集成 b.js) ===
      await executeHumanReadingStrategy(ctx);

      // 3.4 回退
      log("🔙 看完了，准备返回列表...");
      await page.goBack({ waitUntil: "domcontentloaded" });

      // 3.5 思考时间
      // 返回列表后，人类不会立刻点下一个，会重新扫视列表
      log("🤔 正在浏览列表寻找下一个目标...");
      await humanScroll(page, 1); // 简单滚一下列表
      await delay(2000, 4000);
    }

    // 保存一下 Cookie 以防丢失
    await utils.saveCookies();
    log("✅ 本次任务流程结束");
  } catch (error) {
    // === 🚨 调试核心：报错时自动留证 ===
    console.error(`\n❌ [严重错误] 脚本执行中断: ${error.message}`);

    const timestamp = Date.now();
    const screenshotPath = `error_${timestamp}.png`;
    const htmlPath = `error_${timestamp}.html`;

    // 1. 打印当前 URL (判断是否跳到了奇怪的地方)
    console.log(`🔗 当前 URL: ${page.url()}`);

    // 2. 截图
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 已保存现场截图: ${screenshotPath}`);

    // 3. 保存 HTML 源码 (用于分析真实的选择器)
    const html = await page.content();
    fs.writeFileSync(htmlPath, html);
    console.log(`📄 已保存页面源码: ${htmlPath}`);

    // 4. 简单判断是不是验证码页面
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (
      bodyText.includes("Enter the characters you see below") ||
      bodyText.includes("Type the characters")
    ) {
      console.error("⚠️ 检测到 CAPTCHA 验证码页面！指纹或 IP 可能已被标记。");
    }
  }
}
// ==========================================
// 核心拟人化函数库 (根据 b.js 封装)
// ==========================================

/**
 * 策略 A + B: 深度阅读模式
 * 包含：随机视觉悬停、变速滚动、回滚确认
 */
async function executeHumanReadingStrategy(ctx) {
  const { page, cursor, utils } = ctx;
  const { log, delay } = utils;

  log("📖 [开始阅读] 模拟真实用户浏览行为...");

  // 1. 初始视觉扫描 (Hover Intent)
  // 刚进页面，鼠标通常会乱晃，或者停在标题/图片上
  await humanHover(cursor, page, [
    "#imgTagWrapperId",
    "#productTitle",
    "#wayfinding-breadcrumbs_container",
  ]);

  // 2. 深度阅读滚动 (Scroll Dynamics)
  // 模拟：向下读 -> 停顿 -> 向下读 -> 往回翻(确认信息) -> 继续读
  log("📜 [滚动] 开始阅读详情...");

  await page.evaluate(async () => {
    // 浏览器内执行的滚动逻辑
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    // 第一段：快速浏览概况
    window.scrollBy({ top: 400, behavior: "smooth" });
    await sleep(1000 + Math.random() * 500);

    // 第二段：查看详细参数 (慢速)
    window.scrollBy({ top: 300, behavior: "smooth" });
    await sleep(2000 + Math.random() * 1000);

    // 第三段：拟人化回滚 (Human Backtracking)
    // "刚才那个价格是多少来着？" -> 往回滚看一眼
    if (Math.random() > 0.3) {
      window.scrollBy({ top: -250, behavior: "smooth" });
      await sleep(1500);
    }

    // 第四段：查看评论 (大幅滚动)
    window.scrollBy({ top: 800, behavior: "smooth" });
  });

  // 等待滚动逻辑执行完 (Node 端等待)
  await delay(5000, 7000);

  // 3. 再次视觉扫描 (关注点改变)
  // 滚下来后，可能会看评论区的星星，或者类似商品
  await humanHover(cursor, page, [
    "#reviewsMedley",
    ".a-icon-star",
    "#ask_feature_div",
  ]);

  log("📖 [结束阅读] 准备离开...");
  await delay(1000, 2000);
}

/**
 * 辅助：随机悬停 (Strategy A)
 * 随机选择页面存在的元素进行悬停
 */
async function humanHover(cursor, page, selectors) {
  // 打乱顺序
  const shuffled = selectors.sort(() => 0.5 - Math.random());

  for (const selector of shuffled) {
    // 只尝试 50% 的概率去悬停，不要每次都全看一遍，太假
    if (Math.random() > 0.5) continue;

    try {
      // 检查元素是否在视口内
      const isVisible = await page
        .$eval(selector, (elem) => {
          return elem && elem.offsetParent !== null;
        })
        .catch(() => false);

      if (isVisible) {
        // console.log(`[眼球] 看向: ${selector}`);
        await cursor.move(selector);
        // 眼睛停留时间
        await new Promise((r) => setTimeout(r, 500 + Math.random() * 1200));
      }
    } catch (e) {
      // 忽略找不到的元素
    }
  }
}

/**
 * 辅助：简单的列表滚动
 */
async function humanScroll(page, steps = 2) {
  await page.evaluate(async (count) => {
    for (let i = 0; i < count; i++) {
      window.scrollBy({ top: 300 + Math.random() * 200, behavior: "smooth" });
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 500));
    }
  }, steps);
}

/**
 * 随机获取一个电子产品/游戏关键词 (英文/日文，无通用后缀)
 * @returns {string} 随机的关键词
 */
function getRandomProductKeyword() {
  const keywords = [
    // --- Switch Games (English / Japanese) ---
    "The Legend of Zelda: Tears of the Kingdom",
    "ゼルダの伝説 ティアーズ オブ ザ キングダム",
    "Mario Kart 8 Deluxe",
    "マリオカート8 デラックス",
    "Animal Crossing: New Horizons",
    "あつまれ どうぶつの森",
    "Splatoon 3",
    "Ring Fit Adventure",

    // --- PlayStation Games (English / Japanese) ---
    "God of War Ragnarök",
    "Elden Ring",
    "エルデンリング",
    "Final Fantasy XVI",
    "ファイナルファンタジーXVI",
    "Cyberpunk 2077: Phantom Liberty",
    "Resident Evil 4 Remake",
    "BIOHAZARD RE:4", // 日版常见名称

    // --- Electronics (Model Names Only - No suffixes like 'Camera'/'Mouse') ---
    "Sony WH-1000XM5", // 已去掉 Headphones
    "AirPods Pro 2", // 已去掉 Earbuds
    "NVIDIA GeForce RTX 4090", // 已去掉 Graphics Card
    "Logitech MX Master 3S", // 已去掉 Mouse
    "Keychron Q1 Pro", // 已去掉 Keyboard
    "Fujifilm X100VI", // 已去掉 Camera
    "Ricoh GR IIIx",
    "Steam Deck OLED",
    "PlayStation 5 Pro",
  ];

  const randomIndex = Math.floor(Math.random() * keywords.length);
  return keywords[randomIndex];
}
