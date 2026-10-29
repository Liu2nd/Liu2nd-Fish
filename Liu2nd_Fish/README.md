# Liu2nd_Fish — 广告外壳下的迷你网页浏览器

![Liu2nd_Fish Icon](assets/icon.png)

这是一个独立开发的桌面小型网页浏览器。它采用老式广告弹窗皮肤，**中央矩形是一块真正可以交互的网页浏览区域**，不是广告截图。外壳与网页使用不同渲染层。

> 开发状态：v0.2.0 源码与云端打包配置。已通过 Node.js 单元测试和语法检查；尚未完成 Windows/macOS/Linux 实机运行与在线视频兼容性验证。**仓库内不是已经构建好的 EXE。**

## 普通使用者：不安装 Python、Node.js、VS Code

拿到编译后的 `Liu2nd_Fish-0.2.0-Windows-x64-Portable.exe` 后，双击即可使用。

- Windows 10（包括 LTSC 1809）、Windows 11 64 位：首选 Windows-x64 版。
- Windows 10 32 位：选 Windows-x86 版；底层 Electron 43 是最后支持 32 位 Windows 的 Electron 系列，长期维护受限。
- Windows ARM64：选 Windows-arm64 版。
- macOS/Linux：使用对应平台打包文件。

Windows 版集成 Chromium/Electron 运行时，无需安装 Python、Node.js、Chrome 或微软商店。系统须允许正常打开网络，部分影视网站可能阻止嵌入式浏览器登录、播放或受 DRM 限制。**未数字签名的个人项目 EXE 可能出现系统安全警告**；仅运行自己检查过源码、由自己的仓库构建的版本。

### 第一次打开

1. 看到绿色“今日优选”广告皮肤；最上方黑色输入栏输入网址，按 `Enter`。
2. 中间深色矩形将显示网站，可以点击、滚动、播放视频。
3. 点击绿色小齿轮（⚙）打开「软件设置」，在 EXE 内直接修改网址、皮肤、网页区域和快捷键。
4. 在设置中更换图片，拖动绿色框调整网页的显示位置和大小。
5. 在主窗口右下角拖动调整整个弹窗大小。
6. 默认 `Alt+Q`：快速隐藏 / 恢复；`Alt+M`：静音切换；`Ctrl+Alt+S`：打开设置。三项均可在 EXE 内修改、停用或恢复默认。关闭 X 默认隐藏到系统托盘，右键托盘图标可以真正退出。
7. 鼠标按住顶部绿色广告标题栏空白处，可以拖动整个窗口。焦点在网站内时按 `Ctrl + L` 可以选择地址栏。

配置（包括自定义快捷键）自动保存在系统的应用数据文件夹，导入的皮肤也会复制进配置目录，删除原始图片不影响软件使用。

### 在 EXE 中直接编辑，无需重新打包

1. 打开 EXE，点击顶部绿色区域的 **⚙ 设置**，或右击系统托盘选择 **皮肤、网页及快捷键设置**。
2. **网站地址**：直接输入想要浏览的网址并点击「打开网页」。
3. **背景与尺寸**：点击「导入背景图片」；拖动预览中的绿色框移动网页显示区域，拖动它右下角缩放；也可输入 X、Y、宽高数值。更改窗口尺寸、透明度、置顶及静音选项也会即时生效。
4. **自定义全局快捷键**：点击「显示/隐藏」「静音」「打开设置」对应的输入框，然后按下 `Alt+字母`、`Ctrl+Alt+字母` 等组合键，松开后自动生效并保存。按 `Esc` 可取消录制，「停用」解绑该功能，「默认」恢复原组合键。
5. **冲突反馈**：如果操作系统或其他应用占用了组合键，界面会提示失败并保留之前的设置；某些环境（例如 Linux Wayland 或锁屏）可能不允许所有全局组合键。全部停用也能通过系统托盘操作。
6. 修改的是**运行中的配置**，不修改 EXE 的程序代码；以后更新 EXE 时，只要同一个用户的数据目录未清空，原来设置仍保留。

**可编辑的广告外观是整张皮肤图片的导入和网页框位置，不是 EXE 内的专业 Photoshop 级逐像素修图。** 如果需要修改广告文字、商品图，直接制作一张新的背景图导入即可。

## 不会写代码：只用 GitHub 网站获得 EXE

你的电脑不需要安装开发工具。只需要一个 GitHub 账号。

1. 在 GitHub 网页打开 https://github.com/new 创建一个空仓库，名称填写 `Liu2nd_Fish`。**不要勾选自动添加 README**。
2. 下载并解压项目源码 ZIP。打开解压出的 `Liu2nd_Fish` 文件夹，把**里面的内容**上传到新仓库根目录：`.github`、`assets`、`src`、`tests`、`package.json`、`README.md` 等。不要把 ZIP 本身作为唯一文件上传。
3. 可以在 GitHub `Add file → Upload files` 页面拖入解压后的文件及文件夹，确认顶层能看到 `package.json`，并且 `.github/workflows/build.yml` 路径存在。GitHub 官方支持用浏览器拖放文件/文件夹上传。
4. 上传提交后，GitHub Actions 自动开始 Windows 64 位打包。如果没自动执行，打开仓库上方 `Actions`，选择 `制作 Liu2nd_Fish 免安装软件`，点击 `Run workflow`，平台选 `windows-x64`。
5. 打包完成且显示绿色成功标记后，点击这次运行记录最下方 `Artifacts` → `Liu2nd_Fish-Windows-x64`，下载 ZIP；解压后得到 `Portable.exe` 和可能的 `Setup.exe`，普通使用优先 Portable。
6. 如果是 Windows 32 位、ARM64、macOS 或 Linux，在第 4 步的下拉框里选择对应平台手动执行。

**重要：** GitHub Actions 是云端构建，编译阶段由 GitHub 提供 Windows/macOS/Linux 机器；不要求你的电脑有 Python、Node.js、VS Code、Visual Studio 或微软商店。GitHub 的 Actions 使用配额和公共/私人仓库政策由你的账号计划决定。

### 如果打包失败

点开运行记录的红色步骤，复制错误文字交给 Codex / ChatGPT 修复源码，再在 GitHub 页面重跑。首版尚未经过实际 GitHub Actions 完整构建验证。

## 项目结构

```
.github/workflows/build.yml  GitHub 自动制作多平台安装包和便携版
assets/default-skin.png    参考图改造的默认广告皮肤（周围像素保留）
assets/icon.png / icon.ico 程序图标
src/main.js                主进程，网页内核、窗口、托盘、隐藏和设置
src/preload.js             主界面与桌面功能之间的安全通信
src/core/config.js         网址、配置数据验证
src/core/layout.js         广告皮肤和网页区域坐标计算
src/core/shortcuts.js      快捷键规则、冲突校验和默认值
src/ui/main.*              老式广告外观主界面
src/ui/editor.*            无需写代码的皮肤布局编辑器
tests/core.test.js         网址与布局单元测试
CODEx_HANDOFF.md           Codex 开发交接说明
```

## 开发者说明（普通用户不用做）

需要 Node.js 22：

```sh
npm install
npm run check
npm test
npm start
npm run dist:win
```

- Electron 版本固定为 `43.8.4`（兼顾 Win10/32 位专用构建；安全维护期有限）。
- electron-builder 版本固定为 `26.18.0`。
- 远程网页不开 Node 集成、启用沙盒，不允许本地文件与 `javascript:` URL。
- 所有网页的登录 Cookie 在独立持久化 Session 中；不会主动上报给项目作者。
- 默认禁止网页摄像头/麦克风等权限请求。网站可能要求特定权限、登录方式或加密视频 DRM，首版不提供绕过。
- 系统支持范围要以实机测试为准，不宣称所有网页和全部 Windows 版本都可用。

## 版权

原始截图是用户提供的参考素材，只用于该项目内的默认皮肤。源代码为本次独立实现，不含原 FishM 的源代码。项目初版保留全部权利，后续可自行决定发布许可证。
