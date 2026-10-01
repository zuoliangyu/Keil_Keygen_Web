# Keil Keygen Web

适用于 GitHub Pages 的纯静态序列号工具。采用淡绿白配色和卡片布局，提供平台选择、设备信息填写、序列号生成与复制功能。所有计算均在浏览器内完成。

[在线使用](https://zuoliangyu.github.io/Keil_Keygen_Web/)

## 本地使用

安装 Node.js 20 或更新版本，在本项目目录运行：

```powershell
node tools/preview.mjs
```

打开 **http://127.0.0.1:4173/**。无需安装依赖或构建。页面使用 ES modules 与 Web Worker，请通过本地 HTTP 地址或 GitHub Pages 打开，不要直接双击 `site/index.html`。

端口被其他程序占用时，可在 PowerShell 中执行：

```powershell
$env:PORT = '4174'
node tools/preview.mjs
```

## 功能

- 支持 C51、C251、C166、ARM，以及 11 种许可；界面显示中文名称，并在下方注明英文名称。
- 输入 Computer ID 后，点击“生成序列号”或按 Enter，获得 6 组、共 35 字符的结果。
- 点击“复制序列号”复制完整结果。浏览器拒绝剪贴板访问时，显示可选中的完整文本，支持手动复制。
- 修改设备标识、目标平台或许可类型会立即清空旧结果；计算期间修改参数，过期结果不会显示。
- 连续生成推进同一会话的随机状态。刷新页面后开启新会话；不保存设备标识和生成记录。
- 生成在浏览器 Worker 内完成，无后端、外部字体、CDN、分析统计或远程计算请求。
- 设备标识要求为 11 个可打印 ASCII 字符，第 6 位为 `-`。输入的大小写、半角符号和空格保持不变，不自动改为大写或截断。

## 发布到 GitHub Pages

以 **`keil-web/`** 作为仓库根目录。

1. 在 GitHub 创建目标仓库，将当前项目推送到 `main` 或 `master` 分支。
2. 打开仓库 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**。
3. 在 **Actions → 发布 GitHub Pages → Run workflow** 手动运行一次。如果首次推送时尚未启用 Pages，也可以在设置完成后重新运行失败的发布。
4. 工作流成功后，使用部署记录中显示的地址访问网站，通常为 `https://<用户名>.github.io/<仓库名>/`。

后续推送 `site/` 或发布工作流的修改时自动更新网站。流程直接上传 `site/`，无需安装依赖或构建。所有资源与 Worker 路径均为相对路径，适配仓库子路径和站点根路径。

发布配置见 [.github/workflows/pages.yml](.github/workflows/pages.yml)。本仓库已启用 GitHub Actions 发布，默认分支为 `master`。

## 目录

```text
keil-web/
├─ site/                    # GitHub Pages 唯一发布目录
│  ├─ index.html            # 页面结构
│  ├─ styles.css
│  ├─ app.mjs               # 表单、结果和复制交互
│  ├─ session.mjs           # 请求状态、旧结果清理
│  ├─ generator.worker.mjs  # 页面会话的计算线程
│  ├─ core.mjs              # 序列号生成算法
│  └─ favicon.svg
├─ .github/workflows/pages.yml
├─ tests/                   # 功能检查和测试数据
└─ tools/                   # 本地服务器与开发工具
```

## 功能检查

已通过 615 组生成结果检查，覆盖全部平台与许可组合、输入边界和连续生成状态。另有随机流、输入校验、会话状态及 Worker 检查。

按需执行局部检查：

```powershell
node --test tests/core.test.mjs
node --test tests/session.test.mjs
node --test tests/worker.test.mjs
```

这些检查使用 Node.js 内置测试工具，无需安装额外依赖。测试数据已包含在项目中。
