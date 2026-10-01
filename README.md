# Keil Keygen Web

一个轻量的网页序列号工具，采用淡绿白配色和卡片布局。选择平台与许可类型，填写设备标识，即可生成并复制序列号。所有计算均在浏览器内完成。

[打开在线工具](https://zuoliangyu.github.io/Keil_Keygen_Web/) · [查看部署状态](https://github.com/zuoliangyu/Keil_Keygen_Web/actions/workflows/pages.yml)

## 功能

- 支持 C51、C251、C166、ARM 四个平台和 11 种许可。
- 显示中文许可名称，并提供对应的英文名称。
- 点击按钮或按 Enter 生成，共 6 组、35 个字符。
- 一键复制完整结果；自动复制不可用时，可手动选择文本复制。
- 修改设备标识、平台或许可类型后，自动清空旧结果。
- 支持连续生成；不保存设备标识或生成记录。
- 无需后端服务，不上传设备标识。

设备标识（Computer ID）须为 11 个可打印 ASCII 字符，第 6 位为半角连字符，例如 `12345-67890`。输入的大小写、符号和空格均保持不变。

## 本地预览

安装 Node.js 20 或更新版本，然后在项目根目录运行：

```powershell
node tools/preview.mjs
```

启动后，在浏览器中打开 [本地预览：127.0.0.1:4173](http://127.0.0.1:4173/)。

无需安装依赖或构建。页面使用 ES modules 和 Web Worker，需要通过 HTTP 或 HTTPS 访问，不能直接双击 `site/index.html` 打开。

如果端口被占用，可以在 PowerShell 中指定其他端口：

```powershell
$env:PORT = '4174'
node tools/preview.mjs
```

此时访问 [本地预览：127.0.0.1:4174](http://127.0.0.1:4174/)。

## 发布到 GitHub Pages

本仓库已通过 GitHub Actions 发布，默认分支为 `master`。更新 `site/` 目录或发布工作流后，推送到默认分支即可自动更新网站。

在其他仓库部署时：

1. 将本项目作为仓库根目录，推送到 `main` 或 `master` 分支。
2. 在仓库的 Settings → Pages 中，将 Source 设置为 GitHub Actions。
3. 在 Actions 中打开“发布 GitHub Pages”，点击 Run workflow。
4. 等待发布成功，通过部署记录中的网址访问网站。

流程仅发布 `site/` 目录，无需安装依赖或构建。页面资源使用相对路径，支持 GitHub Pages 的仓库子路径。

发布配置：[pages.yml](.github/workflows/pages.yml)。

## 项目结构

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

使用 Node.js 内置测试工具，按需运行：

```powershell
node --test tests/core.test.mjs
node --test tests/session.test.mjs
node --test tests/worker.test.mjs
```

检查覆盖平台与许可组合、输入边界、连续生成、会话状态和 Worker。测试数据已包含在项目中，无需安装额外依赖。
