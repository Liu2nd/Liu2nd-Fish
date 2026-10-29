# Codex 接手说明 — Liu2nd_Fish

项目目标：工作时可打开在线视频网站的微型桌面浏览器。它的外围**模拟旧式国产广告弹窗**，中央是**真实互动的网页显示区域**。不是真广告平台。原始上传参考图 354×376，中央网页窗口默认 x=22, y=80, width=310, height=177。周围皮肤像素必须保持不变（除非用户主动换皮肤）。

关键需求：
1. Windows 10 LTSC 1809 优先；Windows 11、Windows ARM64、Windows x86、macOS、Linux 尽可能兼容，单独 CI 平台打包。
2. 交付给非开发用户的必须是可以双击运行的免安装 EXE，不可要求 Python、Node、Microsoft Store、Visual Studio、PowerShell 脚本。
3. 窗口可自由缩放，网页区域和图片比例独立设置，导入本地 PNG/JPG/WebP，设置可视化拖动。
4. `Alt+Q` 默认全局快捷隐藏/恢复，默认隐藏静音。系统托盘可恢复/退出。配置自动保存。三项全局快捷键必须在 EXE 设置页直接录制、自定义并处理冲突。
5. 网页允许常见 URL、导航、滚动、点击/播放；不要注入 JS 绕开网站限制或规避 DRM。

实现：Electron 43.x + BrowserWindow frameless + WebContentsView（真实网页）+ HTML/CSS（外壳）+ `contextBridge` + electron-builder。核心坐标在 `src/core/layout.js`，配置在 `src/core/config.js`，快捷键校验位于 `src/core/shortcuts.js`，注册位于 `src/main.js`。当前测试 `npm test`、`npm run check` 均通过。

已知风险及下一步优先级：
- **必须在 GitHub Actions 实际构建一次**，通过后下载 EXE 在 Win10 LTSC 1809 实机运行并测试按钮、快捷键、托盘、设置窗口、皮肤导入和窗口缩放。
- 某些影视站对嵌入 Chromium、版权保护 DRM、OAuth 弹窗有要求；先测试合法公开内容，不绕过限制。
- Electron 43 在 2027 年之后 32 位支持停止；评估后续 64 位版本追新、32 位停止更新的双路线。
- 若发现浏览器视频被外壳层遮挡、边界坐标溢出，优先修复视图布局；不可把网页区域偷换成 iframe/视频截图。
- 导入皮肤的坐标映射和保留底图像素要继续自动测试。
- 分屏、高 DPI、多显示器、任务栏托盘隐藏/恢复、系统快捷键冲突要实测。
- 考虑多皮肤方案、皮肤模板导入导出；快捷键自定义已在 0.2.0 加入，需 Windows 实机测试。

任何回归都必须保持非开发用户只需要下载 exe、双击运行；云端编译只能给源码维护者使用。

## v0.2.0 已修改
- 新增 `src/core/shortcuts.js`；全局快捷键（隐藏、静音、设置）可录制/停用/恢复默认，系统冲突不覆盖已保存组合键。录制期间临时停止本程序快捷键注册，结束时重新注册。
- 设置页 EXE 内可输入网址并直接打开、配置网页区域、导入广告皮肤、设置窗口透明度/置顶/静音；上述配置本机保存。
- `npm run check`、`npm test` 共 9 项测试通过；并未验证 Windows EXE、视频播放/托盘/全局快捷键的实际运行，必须先从 GitHub Actions 构建。
