# My Crawler Studio - Worker (Playwright Edition)

这是一个高度可配置、注重“拟人化”行为的自动化采集与操作框架。它基于 [Playwright](https://playwright.dev/) 构建，集成了指纹注入、贝塞尔曲线鼠标轨迹、平滑滚动以及网络响应拦截等高级功能，旨在突破现代网站的反爬虫机制。

## ✨ 核心特性

* **🕵️‍♂️ 极致隐匿 (Stealth & Fingerprint)**
* 集成 `fingerprint-generator` 和 `fingerprint-injector`，自动生成并注入真实的浏览器指纹（UserAgent, Screen, GPU等）。
* 使用 `puppeteer-extra-plugin-stealth` (适配版) 移除自动化特征。
* 自动规避 `blink-features=AutomationControlled` 检测。


* **wd 深度拟人化操作 (Human Behavior)**
* **贝塞尔曲线鼠标轨迹**：重写鼠标移动逻辑，模拟人类手部移动的弧线和随机抖动，拒绝机械直线。
* **视觉反馈调试**：内置可视化“小红点”，实时显示虚拟鼠标的移动轨迹和点击效果（调试模式可见）。
* **阅读模式**：模拟真实用户的浏览习惯，包括随机悬停、不同速度的平滑滚动、回滚阅读等。


* **💾 状态持久化 (Session Persistence)**
* 自动保存和加载 `StorageState` (Cookies, LocalStorage)。
* 支持手动登录模式（Login Mode），一次登录，持久复用。


* **🕸️ 数据全捕获 (Network Capture)**
* 不仅依赖页面解析，还自动拦截并保存所有 `XHR`、`Fetch` 和 `Document` 类型的网络响应。
* 数据以 `dumps` 形式保存，文件名包含哈希和资源类型，便于后续离线分析。


* **🧩 模块化架构**
* **Strategies**: 定义通用的行为逻辑（如：搜索关键词 -> 浏览列表 -> 点击详情 -> 阅读）。
* **Profiles**: 定义特定站点的选择器（Selectors）和规则（如：Amazon, Shopee）。



## 📂 项目结构

```text
my-crawler-studio/worker/
├── config/                 # 全局配置
│   └── browser-config.js   # 浏览器启动参数 (如 headless, args)
├── src/
│   ├── actions/            # 原子动作库
│   │   ├── human-behavior.js # 拟人化逻辑 (滚动, 阅读, 悬停)
│   │   └── navigation.js     # 页面导航封装
│   ├── core/               # 核心引擎
│   │   ├── bootstrap.js      # 系统启动引导 (指纹, Context, Dumps挂载)
│   │   ├── context.js        # 上下文工厂 (注入鼠标轨迹算法, 可视化)
│   │   ├── launcher.js       # 浏览器启动器 (集成 stealth 插件)
│   │   └── runner.js         # 交互式 CLI 运行器
│   ├── profiles/           # 站点配置文件 (Site Configs)
│   │   ├── _template.js      # 新增站点模板
│   │   ├── amazon.js         # Amazon 配置
│   │   └── shopee.js         # Shopee 配置
│   ├── strategies/         # 业务策略
│   │   └── keyword-search.js # "搜索-浏览-点击" 策略
│   └── utils/              # 工具函数 (Logger, FS, Helpers)
├── auth/                   # 存放登录凭证 (自动生成)
├── output/                 # 运行结果输出
│   └── data/               # 按时间戳保存的 HAR, Dumps, Screenshots
├── index.js                # 程序入口
└── package.json            # 依赖定义

```

## 🚀 快速开始

### 1. 环境准备

确保已安装 Node.js (建议 v18+)。

```bash
# 安装依赖
npm install

# 安装 Playwright 浏览器内核
npx playwright install chromium

```

### 2. 运行程序

项目使用交互式命令行界面 (CLI)。

```bash
node index.js

```

### 3. CLI 操作指南

启动后，终端会显示以下菜单：

```text
=== Playwright Native Engine ===
Commands: [r] Run, [l] Login, [q] Quit

```

* **`l` (Login - 手动登录)**:
1. 选择目标站点（如 `amazon` 或 `shopee`）。
2. 浏览器将打开目标主页。
3. **人工操作**完成登录（支持手机号验证码等复杂流程）。
4. 登录完成后，在终端输入 `ok`。
5. 系统会自动提取 Cookies 和 LocalStorage 并保存到 `auth/account_profile.json`。


* **`r` (Run - 执行任务)**:
1. 输入要运行的 Profile 名称（默认：`shopee`）。
2. 输入要使用的 Strategy 名称（默认：`keyword`）。
3. 系统将自动启动浏览器，注入指纹和保存的登录态，开始自动搜索关键词并浏览商品。


* **`q` (Quit)**: 退出程序并清理资源。

## ⚙️ 配置说明

### 添加新站点 (Profile)

在 `src/profiles/` 目录下创建一个新的 `.js` 文件（参考 `_template.js`）。

关键配置项：

* **domains**: 用于匹配 URL。
* **selectors**: CSS 选择器，告诉策略去哪里找输入框、商品列表、标题等。
* `resultCard`: 商品列表中的单个卡片容器。
* `detailHoverTargets`: 详情页中鼠标随机悬停的地方（增加拟人真实度）。



### 调整浏览器参数

修改 `config/browser-config.js`：

* `headless`: 设置为 `true` 可开启无头模式（生产环境），`false` 用于调试。
* `args`: 可添加自定义 Chrome 启动参数。

## 🛠️ 核心代码解析

### 拟人化鼠标 (`src/core/context.js`)

该模块并没有使用现成的 `ghost-cursor` 库，而是**内置实现**了一套更贴合 Playwright 的逻辑：

* `generateBezierPath`: 计算贝塞尔曲线路径。
* `cursor.move(target)`: 自动将 CSS 选择器或 Locator 转换为坐标，并沿曲线平滑移动。
* **调试红点**: 在页面中注入 JS/CSS，在鼠标位置绘制一个半透明红点，让你亲眼看到脚本的“手”在怎么动。

### 指纹自动修复 (`src/core/bootstrap.js`)

每次启动时，系统会检查 `auth/account_profile.json` 中的指纹数据。

* 如果指纹不存在或格式过时，系统会调用 `fingerprint-generator` 生成一套全新的指纹（OS, CPU, Screen, Headers）。
* 一旦生成，指纹会与账号绑定持久化，防止同一账号在不同指纹间跳变导致风控。

### 网络转储 (`src/utils/network-capture.js`)

监听 `page.on('response')`，过滤出 `document`, `xhr`, `fetch`。
文件保存路径：`output/data/<TIMESTAMP>/dumps/`。
文件名格式：`类型_哈希_URL片段` (例如 `xhr_a1b2c3d4_api_search_items`)。

## ⚠️ 免责声明

本项目仅供学习 Playwright 自动化技术及反爬虫攻防研究使用。请勿用于非法抓取受版权保护的数据或对目标服务器造成攻击。使用者需自行承担所有法律责任。