# 滚动条控制器 (Scrollbar Controller)

![](https://img.shields.io/badge/100%25%20VIBE%20-8A2BE2)

一个简洁的油猴脚本，用来隐藏网页滚动条，方便录屏使用。

![](./assets/images/scrollbar-controller.png)

## 功能特性

- **三种显示模式**：默认、永久隐藏、智能显示
- **简洁界面**：右下角紫色圆点控制，不干扰浏览体验
- **智能兼容**：支持主流浏览器，自动处理兼容性问题
- **轻量高效**：纯JavaScript实现，无外部依赖

## 安装使用

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 点击 [安装脚本](scrollbar-control.user.js) 或复制脚本内容到Tampermonkey
3. 访问任意网页，右下角会出现紫色控制圆点

## 使用说明

### 控制模式

- **默认模式**：显示原始滚动条样式
- **隐藏模式**：永远隐藏滚动条，保持滚动功能
- **智能模式**：滚动时显示，停止后自动隐藏

### 操作方式

1. 点击右下角紫色圆点打开控制面板
2. 选择所需的滚动条显示模式
3. 点击面板外部区域关闭控制面板

## 浏览器支持

- ✅ Chrome 60+
- ✅ Firefox 60+
- ✅ Safari 12+
- ✅ Edge 79+
- ✅ Opera 47+

## 技术特性

- 跨浏览器CSS兼容性处理
- CSS注入失败时的降级方案
- 智能滚动检测算法
- 完整的错误处理机制

## 开发

脚本采用模块化架构设计：

- `StyleManager` - 样式管理和CSS注入
- `UIController` - 用户界面控制
- `ScrollDetector` - 滚动事件检测
- `BrowserDetector` - 浏览器兼容性检测

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。

---

**注意**：此脚本仅影响滚动条的视觉显示，不会影响网页的滚动功能。
