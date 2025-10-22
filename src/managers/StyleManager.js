import { BrowserDetector } from '../detectors/BrowserDetector.js';
import { ScrollbarModes } from '../utils/constants.js';

/**
 * StyleManager - 负责CSS样式的动态注入和管理
 *
 * 提供滚动条样式控制功能，支持三种模式：
 * - default: 显示原始滚动条
 * - always: 永远隐藏滚动条
 * - semi: 滚动时显示，停止后隐藏
 */
export class StyleManager {
    constructor(eventBus, browserDetector = null) {
        this.eventBus = eventBus;
        this.currentMode = ScrollbarModes.DEFAULT;
        this.styleElement = null;
        this.isInitialized = false;
        this.scrollDetector = null; // ScrollDetector引用
        this.browserDetector = browserDetector || new BrowserDetector(); // 浏览器检测器
        this.compatibilityReport = this.browserDetector.getCompatibilityReport();

        // 初始化样式管理器
        this.initialize();
    }

    /**
     * 初始化样式管理器
     */
    initialize() {
        try {
            // 检查浏览器兼容性
            if (!this.checkBrowserCompatibility()) {
                console.warn('[StyleManager] 浏览器兼容性检查失败，但继续初始化');
            }

            this.injectBaseStyles();
            this.isInitialized = true;
            console.log('[StyleManager] 初始化完成');

            // 输出兼容性报告
            this.logCompatibilityReport();

            // 发送初始化完成事件
            this.eventBus.emit('style-manager:initialized', {
                mode: this.currentMode,
                isReady: this.isReady()
            });
        } catch (error) {
            console.error('[StyleManager] 初始化失败:', error);
            this.eventBus.emit('style-manager:error', { error, phase: 'initialization' });
        }
    }

    /**
     * 注入基础样式
     */
    injectBaseStyles() {
        if (this.styleElement) {
            return; // 避免重复注入
        }

        try {
            // 创建style元素
            this.styleElement = document.createElement('style');
            this.styleElement.id = 'scrollbar-controller-styles';

            // 将style元素添加到head中
            document.head.appendChild(this.styleElement);

            // 验证样式注入是否成功
            if (!this.validateStyleInjection()) {
                throw new Error('样式注入验证失败');
            }

            console.log('[StyleManager] 基础样式元素已创建');
        } catch (error) {
            console.error('[StyleManager] 基础样式注入失败:', error);
            // 尝试降级处理
            this.handleStyleInjectionFailure();
            throw error;
        }
    }

    /**
     * 设置滚动条模式
     * @param {string} mode - 滚动条模式 ('default' | 'always' | 'semi')
     */
    setMode(mode) {
        if (!Object.values(ScrollbarModes).includes(mode)) {
            console.warn('[StyleManager] 无效的模式:', mode);
            return false;
        }

        if (this.currentMode === mode) {
            return true; // 模式未改变
        }

        const previousMode = this.currentMode;

        try {
            this.currentMode = mode;
            this.updateStyles();
            console.log('[StyleManager] 模式已切换到:', mode);

            // 发送模式变更事件
            this.eventBus.emit('style-manager:mode-changed', {
                previousMode,
                currentMode: mode,
                timestamp: Date.now()
            });

            return true;
        } catch (error) {
            console.error('[StyleManager] 模式切换失败:', error);
            this.currentMode = previousMode; // 回滚
            this.eventBus.emit('style-manager:error', { error, phase: 'mode-change', mode });
            return false;
        }
    }

    /**
     * 获取跨浏览器滚动条隐藏CSS
     * @returns {string} CSS样式字符串
     */
    getScrollbarHideCSS() {
        const browser = this.compatibilityReport.browser;
        const features = this.compatibilityReport.features;
        let css = '';

        try {
            // 根据浏览器类型生成相应的CSS
            if (browser.isWebkit && features.webkitScrollbar) {
                css += `
                    /* Webkit浏览器 (Chrome, Safari, Edge) */
                    ::-webkit-scrollbar {
                        width: 0px !important;
                        background: transparent !important;
                    }
                    
                    ::-webkit-scrollbar-track {
                        background: transparent !important;
                    }
                    
                    ::-webkit-scrollbar-thumb {
                        background: transparent !important;
                    }
                `;
            }

            if (browser.isGecko && features.scrollbarWidth) {
                css += `
                    /* Firefox */
                    html {
                        scrollbar-width: none !important;
                    }
                `;
            }

            if (browser.isTrident && features.msOverflowStyle) {
                css += `
                    /* IE和旧版Edge */
                    body {
                        -ms-overflow-style: none !important;
                    }
                `;
            }

            // 确保滚动功能不受影响
            css += `
                /* 确保滚动功能不受影响 */
                html, body {
                    overflow-y: auto !important;
                }
            `;

            // 如果是不支持的浏览器，添加通用样式
            if (!browser.isWebkit && !browser.isGecko && !browser.isTrident) {
                console.warn('[StyleManager] 未知浏览器，使用通用样式');
                css += `
                    /* 通用样式尝试 */
                    html {
                        scrollbar-width: none !important;
                    }
                    body {
                        -ms-overflow-style: none !important;
                    }
                `;
            }

            return css;
        } catch (error) {
            console.error('[StyleManager] 生成CSS失败:', error);
            // 返回基础CSS作为降级
            return `
                html { scrollbar-width: none !important; }
                body { -ms-overflow-style: none !important; }
                html, body { overflow-y: auto !important; }
            `;
        }
    }

    /**
     * 获取滚动条恢复CSS
     * @returns {string} CSS样式字符串
     */
    getScrollbarRestoreCSS() {
        return `
            /* 恢复Webkit浏览器滚动条 */
            ::-webkit-scrollbar {
                width: auto !important;
                background: auto !important;
            }
            
            ::-webkit-scrollbar-track {
                background: auto !important;
            }
            
            ::-webkit-scrollbar-thumb {
                background: auto !important;
            }
            
            /* 恢复Firefox滚动条 */
            html {
                scrollbar-width: auto !important;
            }
            
            /* 恢复IE和旧版Edge滚动条 */
            body {
                -ms-overflow-style: auto !important;
            }
        `;
    }

    /**
     * 注入CSS样式
     * @param {string} cssText - CSS样式文本
     */
    injectCSS(cssText) {
        if (!this.styleElement) {
            console.warn('[StyleManager] 样式元素不存在，无法注入CSS');
            return false;
        }

        try {
            this.styleElement.textContent = cssText;

            // 验证CSS注入是否成功
            if (!this.validateCSSInjection(cssText)) {
                console.warn('[StyleManager] CSS注入验证失败，尝试降级方案');
                return this.fallbackInlineStyles(cssText);
            }

            return true;
        } catch (error) {
            console.error('[StyleManager] CSS注入失败:', error);
            // 尝试降级到内联样式
            return this.fallbackInlineStyles(cssText);
        }
    }

    /**
     * 移除所有CSS样式
     */
    removeCSS() {
        if (this.styleElement) {
            this.styleElement.textContent = '';
        }
    }

    /**
     * 显示滚动条
     */
    showScrollbar() {
        try {
            this.removeCSS();
            // 清理可能的内联样式
            this.cleanupInlineStyles();
            console.log('[StyleManager] 滚动条已显示');

            // 发送滚动条显示事件
            this.eventBus.emit('scrollbar:show', {
                mode: this.currentMode,
                timestamp: Date.now()
            });

            return true;
        } catch (error) {
            console.error('[StyleManager] 显示滚动条失败:', error);
            // 尝试通过内联样式恢复
            try {
                document.documentElement.style.scrollbarWidth = '';
                document.body.style.msOverflowStyle = '';
                console.log('[StyleManager] 通过内联样式恢复滚动条显示');
                return true;
            } catch (fallbackError) {
                console.error('[StyleManager] 滚动条显示降级失败:', fallbackError);
                this.eventBus.emit('style-manager:error', {
                    error: fallbackError,
                    phase: 'show-scrollbar'
                });
                return false;
            }
        }
    }

    /**
     * 隐藏滚动条
     */
    hideScrollbar() {
        try {
            const hideCSS = this.getScrollbarHideCSS();
            const success = this.injectCSS(hideCSS);
            if (success) {
                console.log('[StyleManager] 滚动条已隐藏');
            } else {
                console.warn('[StyleManager] CSS注入失败，已使用降级方案');
            }

            // 发送滚动条隐藏事件
            this.eventBus.emit('scrollbar:hide', {
                mode: this.currentMode,
                timestamp: Date.now()
            });

            return success;
        } catch (error) {
            console.error('[StyleManager] 隐藏滚动条失败:', error);
            this.eventBus.emit('style-manager:error', { error, phase: 'hide-scrollbar' });
            // 最后的降级尝试
            return this.fallbackInlineStyles(this.getScrollbarHideCSS());
        }
    }

    /**
     * 应用默认模式 - 显示原始滚动条
     */
    applyDefaultMode() {
        try {
            // 停止ScrollDetector检测（如果存在）
            if (this.scrollDetector && typeof this.scrollDetector.stopDetection === 'function') {
                this.scrollDetector.stopDetection();
            }

            this.showScrollbar();
            console.log('[StyleManager] 已应用默认模式');
            return true;
        } catch (error) {
            console.error('[StyleManager] 应用默认模式失败:', error);
            return false;
        }
    }

    /**
     * 应用永久隐藏模式 - 永远隐藏滚动条
     */
    applyAlwaysMode() {
        try {
            // 停止ScrollDetector检测（如果存在）
            if (this.scrollDetector && typeof this.scrollDetector.stopDetection === 'function') {
                this.scrollDetector.stopDetection();
            }

            this.hideScrollbar();
            console.log('[StyleManager] 已应用永久隐藏模式');
            return true;
        } catch (error) {
            console.error('[StyleManager] 应用永久隐藏模式失败:', error);
            return false;
        }
    }

    /**
     * 应用半透明模式 - 滚动时显示，停止后隐藏
     * 注意：此模式需要与ScrollDetector配合使用
     */
    applySemiMode() {
        try {
            // 初始状态隐藏滚动条
            this.hideScrollbar();

            // 通知ScrollDetector启动检测（如果存在）
            if (this.scrollDetector && typeof this.scrollDetector.startDetection === 'function') {
                this.scrollDetector.startDetection();
            }

            console.log('[StyleManager] 已应用半透明模式');
            return true;
        } catch (error) {
            console.error('[StyleManager] 应用半透明模式失败:', error);
            return false;
        }
    }

    /**
     * 为semi模式临时显示滚动条
     * 此方法专门用于ScrollDetector调用
     */
    showScrollbarForSemi() {
        if (this.currentMode !== ScrollbarModes.SEMI) {
            return false;
        }

        try {
            this.showScrollbar();
            return true;
        } catch (error) {
            console.error('[StyleManager] Semi模式显示滚动条失败:', error);
            return false;
        }
    }

    /**
     * 为semi模式隐藏滚动条
     * 此方法专门用于ScrollDetector调用
     */
    hideScrollbarForSemi() {
        if (this.currentMode !== ScrollbarModes.SEMI) {
            return false;
        }

        try {
            this.hideScrollbar();
            return true;
        } catch (error) {
            console.error('[StyleManager] Semi模式隐藏滚动条失败:', error);
            return false;
        }
    }

    /**
     * 更新样式
     */
    updateStyles() {
        if (!this.styleElement) {
            console.warn('[StyleManager] 样式元素不存在，无法更新样式');
            return false;
        }

        let success = false;

        // 根据当前模式应用相应的样式
        switch (this.currentMode) {
            case ScrollbarModes.DEFAULT:
                success = this.applyDefaultMode();
                break;

            case ScrollbarModes.ALWAYS:
                success = this.applyAlwaysMode();
                break;

            case ScrollbarModes.SEMI:
                success = this.applySemiMode();
                break;

            default:
                console.warn('[StyleManager] 未知的滚动条模式:', this.currentMode);
                success = this.applyDefaultMode(); // 降级到默认模式
                break;
        }

        if (success) {
            console.log('[StyleManager] 样式已更新为模式:', this.currentMode);
        }

        return success;
    }

    /**
     * 获取当前模式
     * @returns {string} 当前滚动条模式
     */
    getCurrentMode() {
        return this.currentMode;
    }

    /**
     * 设置ScrollDetector引用
     * @param {ScrollDetector} scrollDetector - ScrollDetector实例
     */
    setScrollDetector(scrollDetector) {
        this.scrollDetector = scrollDetector;
        console.log('[StyleManager] ScrollDetector引用已设置');
    }

    /**
     * 检查是否已初始化
     * @returns {boolean} 初始化状态
     */
    isReady() {
        return this.isInitialized && this.styleElement !== null;
    }

    /**
     * 验证样式注入是否成功
     * @returns {boolean} 验证结果
     */
    validateStyleInjection() {
        try {
            // 检查样式元素是否存在于DOM中
            if (!this.styleElement || !this.styleElement.parentNode) {
                console.warn('[StyleManager] 样式元素未正确添加到DOM');
                return false;
            }

            // 检查样式元素是否在head中
            if (this.styleElement.parentNode !== document.head) {
                console.warn('[StyleManager] 样式元素不在head中');
                return false;
            }

            // 检查样式元素的基本属性
            if (!this.styleElement.id || this.styleElement.id !== 'scrollbar-controller-styles') {
                console.warn('[StyleManager] 样式元素ID不正确');
                return false;
            }

            return true;
        } catch (error) {
            console.error('[StyleManager] 样式注入验证异常:', error);
            return false;
        }
    }

    /**
     * 验证CSS注入是否成功
     * @param {string} cssText - 注入的CSS文本
     * @returns {boolean} 验证结果
     */
    validateCSSInjection(cssText) {
        try {
            // 检查样式元素内容是否正确设置
            if (this.styleElement.textContent !== cssText) {
                console.warn('[StyleManager] CSS内容设置失败');
                return false;
            }

            // 检查样式是否生效（通过检查计算样式）
            if (cssText.includes('scrollbar-width: none')) {
                const htmlStyle = window.getComputedStyle(document.documentElement);
                if (htmlStyle.scrollbarWidth !== 'none') {
                    console.warn('[StyleManager] Firefox滚动条样式未生效');
                    // Firefox样式可能需要时间生效，不立即判定为失败
                }
            }

            return true;
        } catch (error) {
            console.error('[StyleManager] CSS注入验证异常:', error);
            return false;
        }
    }

    /**
     * 处理样式注入失败的降级处理
     */
    handleStyleInjectionFailure() {
        try {
            console.log('[StyleManager] 开始样式注入失败降级处理');

            // 尝试重新创建样式元素
            if (this.styleElement && this.styleElement.parentNode) {
                this.styleElement.parentNode.removeChild(this.styleElement);
            }

            // 尝试不同的创建方式
            this.styleElement = document.createElement('style');
            this.styleElement.id = 'scrollbar-controller-styles-fallback';

            // 尝试添加到不同位置
            const targetParent = document.head || document.documentElement || document.body;
            if (targetParent) {
                targetParent.appendChild(this.styleElement);
                console.log('[StyleManager] 降级样式元素已创建');
            } else {
                console.error('[StyleManager] 无法找到合适的父元素');
                this.styleElement = null;
            }
        } catch (error) {
            console.error('[StyleManager] 降级处理失败:', error);
            this.styleElement = null;
        }
    }

    /**
     * 降级到内联样式的备用方案
     * @param {string} cssText - CSS样式文本
     * @returns {boolean} 是否成功应用内联样式
     */
    fallbackInlineStyles(cssText) {
        try {
            console.log('[StyleManager] 尝试内联样式降级方案');

            // 解析CSS并应用到相关元素
            if (cssText.includes('scrollbar-width: none')) {
                // Firefox样式
                document.documentElement.style.scrollbarWidth = 'none';
                console.log('[StyleManager] 已应用Firefox内联样式');
            }

            if (cssText.includes('-ms-overflow-style: none')) {
                // IE/Edge样式
                document.body.style.msOverflowStyle = 'none';
                console.log('[StyleManager] 已应用IE/Edge内联样式');
            }

            if (cssText.includes('overflow-y: auto')) {
                // 确保滚动功能
                document.documentElement.style.overflowY = 'auto';
                document.body.style.overflowY = 'auto';
                console.log('[StyleManager] 已确保滚动功能');
            }

            // Webkit样式无法通过内联样式实现，但记录警告
            if (cssText.includes('::-webkit-scrollbar')) {
                console.warn('[StyleManager] Webkit滚动条样式无法通过内联样式实现');
            }

            return true;
        } catch (error) {
            console.error('[StyleManager] 内联样式降级失败:', error);
            return false;
        }
    }

    /**
     * 清理内联样式
     */
    cleanupInlineStyles() {
        try {
            // 清理可能应用的内联样式
            if (document.documentElement.style.scrollbarWidth) {
                document.documentElement.style.scrollbarWidth = '';
            }
            if (document.body.style.msOverflowStyle) {
                document.body.style.msOverflowStyle = '';
            }
            if (document.documentElement.style.overflowY) {
                document.documentElement.style.overflowY = '';
            }
            if (document.body.style.overflowY) {
                document.body.style.overflowY = '';
            }

            console.log('[StyleManager] 内联样式已清理');
        } catch (error) {
            console.error('[StyleManager] 清理内联样式失败:', error);
        }
    }

    /**
     * 检查浏览器兼容性
     * @returns {boolean} 兼容性检查结果
     */
    checkBrowserCompatibility() {
        try {
            const report = this.compatibilityReport;
            let isCompatible = true;
            const issues = [];

            // 检查是否为现代浏览器
            if (!report.isModern) {
                issues.push('浏览器版本过旧');
                isCompatible = false;
            }

            // 检查必要的API
            if (!report.apis.addEventListener) {
                issues.push('不支持addEventListener');
                isCompatible = false;
            }

            if (!report.apis.getComputedStyle) {
                issues.push('不支持getComputedStyle');
                isCompatible = false;
            }

            // 检查滚动条样式支持
            const hasScrollbarSupport =
                report.features.webkitScrollbar ||
                report.features.scrollbarWidth ||
                report.features.msOverflowStyle;

            if (!hasScrollbarSupport) {
                issues.push('不支持滚动条样式控制');
                console.warn('[StyleManager] 浏览器不支持滚动条样式控制，功能可能受限');
            }

            if (issues.length > 0) {
                console.warn('[StyleManager] 兼容性问题:', issues);
            }

            return isCompatible;
        } catch (error) {
            console.error('[StyleManager] 兼容性检查失败:', error);
            return false;
        }
    }

    /**
     * 输出兼容性报告
     */
    logCompatibilityReport() {
        try {
            const report = this.compatibilityReport;
            console.group('[StyleManager] 浏览器兼容性报告');
            console.log('浏览器:', report.browser.name, report.browser.version);
            console.log('引擎:', report.browser.engine);
            console.log('现代浏览器:', report.isModern);
            console.log('滚动条支持:', {
                webkit: report.features.webkitScrollbar,
                firefox: report.features.scrollbarWidth,
                ie: report.features.msOverflowStyle
            });
            console.log('API支持:', report.apis);
            console.groupEnd();
        } catch (error) {
            console.error('[StyleManager] 输出兼容性报告失败:', error);
        }
    }

    /**
     * 清理资源
     */
    cleanup() {
        try {
            if (this.styleElement && this.styleElement.parentNode) {
                this.styleElement.parentNode.removeChild(this.styleElement);
                this.styleElement = null;
            }

            // 清理可能的内联样式
            this.cleanupInlineStyles();

            this.currentMode = ScrollbarModes.DEFAULT;
            this.isInitialized = false;
            this.browserDetector = null;
            this.compatibilityReport = null;

            // 发送清理完成事件
            this.eventBus.emit('style-manager:cleanup', {
                timestamp: Date.now()
            });

            console.log('[StyleManager] 资源清理完成');
        } catch (error) {
            console.error('[StyleManager] 清理过程中发生错误:', error);
            this.eventBus.emit('style-manager:error', { error, phase: 'cleanup' });
        }
    }
}
