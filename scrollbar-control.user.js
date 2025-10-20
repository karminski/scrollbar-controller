// ==UserScript==
// @name         scrollbar-controller
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  提供对网页滚动条显示的精细控制，支持三种显示模式
// @author       karminski-牙医
// @match        *://*/*
// @grant        none
// @run-at       document-end
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    // 脚本状态管理
    let scriptInitialized = false;
    let cleanupFunctions = [];

    // 滚动条模式枚举
    const ScrollbarModes = {
        DEFAULT: 'default',    // 显示原始滚动条
        ALWAYS: 'always',      // 永远隐藏滚动条
        SEMI: 'semi'           // 滚动时显示，停止后隐藏
    };

    /**
     * BrowserDetector - 浏览器检测和兼容性处理工具类
     */
    class BrowserDetector {
        constructor() {
            this.userAgent = navigator.userAgent.toLowerCase();
            this.browserInfo = this.detectBrowser();
            this.features = this.detectFeatures();

            console.log('[BrowserDetector] 浏览器检测完成:', this.browserInfo);
        }

        /**
         * 检测浏览器类型和版本
         * @returns {Object} 浏览器信息
         */
        detectBrowser() {
            const ua = this.userAgent;
            let browser = {
                name: 'unknown',
                version: '0',
                engine: 'unknown',
                isWebkit: false,
                isGecko: false,
                isBlink: false,
                isTrident: false
            };

            try {
                // Chrome
                if (ua.includes('chrome') && !ua.includes('edg')) {
                    browser.name = 'chrome';
                    browser.engine = 'blink';
                    browser.isBlink = true;
                    browser.isWebkit = true;
                    const match = ua.match(/chrome\/(\d+)/);
                    if (match) browser.version = match[1];
                }
                // Edge (Chromium-based)
                else if (ua.includes('edg')) {
                    browser.name = 'edge';
                    browser.engine = 'blink';
                    browser.isBlink = true;
                    browser.isWebkit = true;
                    const match = ua.match(/edg\/(\d+)/);
                    if (match) browser.version = match[1];
                }
                // Firefox
                else if (ua.includes('firefox')) {
                    browser.name = 'firefox';
                    browser.engine = 'gecko';
                    browser.isGecko = true;
                    const match = ua.match(/firefox\/(\d+)/);
                    if (match) browser.version = match[1];
                }
                // Safari
                else if (ua.includes('safari') && !ua.includes('chrome')) {
                    browser.name = 'safari';
                    browser.engine = 'webkit';
                    browser.isWebkit = true;
                    const match = ua.match(/version\/(\d+)/);
                    if (match) browser.version = match[1];
                }
                // Internet Explorer
                else if (ua.includes('trident') || ua.includes('msie')) {
                    browser.name = 'ie';
                    browser.engine = 'trident';
                    browser.isTrident = true;
                    const match = ua.match(/(?:msie |rv:)(\d+)/);
                    if (match) browser.version = match[1];
                }
                // Opera
                else if (ua.includes('opr') || ua.includes('opera')) {
                    browser.name = 'opera';
                    browser.engine = 'blink';
                    browser.isBlink = true;
                    browser.isWebkit = true;
                    const match = ua.match(/(?:opr|opera)\/(\d+)/);
                    if (match) browser.version = match[1];
                }

                return browser;
            } catch (error) {
                console.error('[BrowserDetector] 浏览器检测失败:', error);
                return browser;
            }
        }

        /**
         * 检测浏览器特性支持
         * @returns {Object} 特性支持信息
         */
        detectFeatures() {
            const features = {
                webkitScrollbar: false,
                scrollbarWidth: false,
                msOverflowStyle: false,
                cssCustomProperties: false,
                requestAnimationFrame: false,
                addEventListener: false
            };

            try {
                // 检测Webkit滚动条支持
                const testElement = document.createElement('div');
                testElement.style.cssText = '::-webkit-scrollbar { width: 0px; }';
                features.webkitScrollbar = testElement.style.cssText.includes('webkit-scrollbar') ||
                    this.browserInfo.isWebkit;

                // 检测Firefox scrollbar-width支持
                features.scrollbarWidth = 'scrollbarWidth' in document.documentElement.style ||
                    this.browserInfo.isGecko;

                // 检测IE/Edge -ms-overflow-style支持
                features.msOverflowStyle = 'msOverflowStyle' in document.documentElement.style ||
                    this.browserInfo.isTrident;

                // 检测CSS自定义属性支持
                features.cssCustomProperties = window.CSS && window.CSS.supports &&
                    window.CSS.supports('--test', '0');

                // 检测requestAnimationFrame支持
                features.requestAnimationFrame = typeof window.requestAnimationFrame === 'function';

                // 检测addEventListener支持
                features.addEventListener = typeof document.addEventListener === 'function';

                return features;
            } catch (error) {
                console.error('[BrowserDetector] 特性检测失败:', error);
                return features;
            }
        }

        /**
         * 获取浏览器信息
         * @returns {Object} 浏览器信息
         */
        getBrowserInfo() {
            return this.browserInfo;
        }

        /**
         * 获取特性支持信息
         * @returns {Object} 特性支持信息
         */
        getFeatures() {
            return this.features;
        }

        /**
         * 检查是否为现代浏览器
         * @returns {boolean} 是否为现代浏览器
         */
        isModernBrowser() {
            const version = parseInt(this.browserInfo.version);

            switch (this.browserInfo.name) {
                case 'chrome':
                    return version >= 60;
                case 'firefox':
                    return version >= 60;
                case 'safari':
                    return version >= 12;
                case 'edge':
                    return version >= 79; // Chromium-based Edge
                case 'opera':
                    return version >= 47;
                case 'ie':
                    return version >= 11;
                default:
                    return false;
            }
        }

        /**
         * 获取适合当前浏览器的CSS前缀
         * @returns {Array} CSS前缀数组
         */
        getCSSPrefixes() {
            const prefixes = [];

            if (this.browserInfo.isWebkit) {
                prefixes.push('-webkit-');
            }
            if (this.browserInfo.isGecko) {
                prefixes.push('-moz-');
            }
            if (this.browserInfo.isTrident) {
                prefixes.push('-ms-');
            }

            return prefixes;
        }

        /**
         * 检查特定API是否可用
         * @param {string} apiName - API名称
         * @returns {boolean} API是否可用
         */
        isAPIAvailable(apiName) {
            try {
                switch (apiName) {
                    case 'requestAnimationFrame':
                        return typeof window.requestAnimationFrame === 'function';
                    case 'getComputedStyle':
                        return typeof window.getComputedStyle === 'function';
                    case 'addEventListener':
                        return typeof document.addEventListener === 'function';
                    case 'querySelector':
                        return typeof document.querySelector === 'function';
                    case 'classList':
                        return 'classList' in document.createElement('div');
                    default:
                        return false;
                }
            } catch (error) {
                console.error('[BrowserDetector] API检查失败:', apiName, error);
                return false;
            }
        }

        /**
         * 获取浏览器兼容性报告
         * @returns {Object} 兼容性报告
         */
        getCompatibilityReport() {
            return {
                browser: this.browserInfo,
                features: this.features,
                isModern: this.isModernBrowser(),
                prefixes: this.getCSSPrefixes(),
                apis: {
                    requestAnimationFrame: this.isAPIAvailable('requestAnimationFrame'),
                    getComputedStyle: this.isAPIAvailable('getComputedStyle'),
                    addEventListener: this.isAPIAvailable('addEventListener'),
                    querySelector: this.isAPIAvailable('querySelector'),
                    classList: this.isAPIAvailable('classList')
                }
            };
        }
    }

    /**
     * StyleManager - 负责CSS样式的动态注入和管理
     */
    class StyleManager {
        constructor() {
            this.currentMode = ScrollbarModes.DEFAULT;
            this.styleElement = null;
            this.isInitialized = false;
            this.scrollDetector = null; // ScrollDetector引用
            this.browserDetector = new BrowserDetector(); // 浏览器检测器
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
            } catch (error) {
                console.error('[StyleManager] 初始化失败:', error);
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

            try {
                this.currentMode = mode;
                this.updateStyles();
                console.log('[StyleManager] 模式已切换到:', mode);
                return true;
            } catch (error) {
                console.error('[StyleManager] 模式切换失败:', error);
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
                return success;
            } catch (error) {
                console.error('[StyleManager] 隐藏滚动条失败:', error);
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
                const hasScrollbarSupport = report.features.webkitScrollbar ||
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
         * 获取浏览器特定的降级方案
         * @returns {Object} 降级方案配置
         */
        getBrowserSpecificFallback() {
            const browser = this.compatibilityReport.browser;

            return {
                useInlineStyles: !this.compatibilityReport.isModern,
                preferredMethod: browser.isWebkit ? 'webkit' :
                    browser.isGecko ? 'firefox' :
                        browser.isTrident ? 'ie' : 'generic',
                requiresPolyfill: !this.compatibilityReport.apis.requestAnimationFrame,
                supportLevel: this.compatibilityReport.isModern ? 'full' : 'limited'
            };
        }

        /**
         * 处理浏览器特定的API差异
         * @param {string} apiName - API名称
         * @param {Function} callback - 回调函数
         * @param {...any} args - 参数
         */
        handleBrowserAPI(apiName, callback, ...args) {
            try {
                switch (apiName) {
                    case 'requestAnimationFrame':
                        if (this.compatibilityReport.apis.requestAnimationFrame) {
                            return window.requestAnimationFrame(callback);
                        } else {
                            // 降级到setTimeout
                            return setTimeout(callback, 16);
                        }

                    case 'addEventListener':
                        if (this.compatibilityReport.apis.addEventListener) {
                            return document.addEventListener(...args);
                        } else if (document.attachEvent) {
                            // IE8及以下版本降级
                            return document.attachEvent('on' + args[0], args[1]);
                        }
                        break;

                    default:
                        return callback(...args);
                }
            } catch (error) {
                console.error('[StyleManager] 浏览器API处理失败:', apiName, error);
                return null;
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

                console.log('[StyleManager] 资源清理完成');
            } catch (error) {
                console.error('[StyleManager] 清理过程中发生错误:', error);
            }
        }
    }

    /**
     * UIController - 管理用户界面组件的创建和交互
     */
    class UIController {
        constructor(styleManager) {
            this.styleManager = styleManager;
            this.controlDotElement = null;
            this.controlPanelElement = null;
            this.panelVisible = false;
            this.currentMode = ScrollbarModes.DEFAULT;
            this.documentClickHandler = null;

            // 初始化UI控制器
            this.initialize();
        }

        /**
         * 初始化UI控制器
         */
        initialize() {
            try {
                // 检查浏览器兼容性
                if (!this.checkUICompatibility()) {
                    console.warn('[UIController] UI兼容性检查失败，但继续初始化');
                }

                this.createControlDot();
                this.createControlPanel();
                this.createOptionButtons();
                this.setupDocumentClickHandler();
                console.log('[UIController] 初始化完成');
            } catch (error) {
                console.error('[UIController] 初始化失败:', error);
            }
        }

        /**
         * 创建控制圆点
         */
        createControlDot() {
            if (this.controlDotElement) {
                return; // 避免重复创建
            }

            try {
                // 创建圆点元素
                this.controlDotElement = document.createElement('div');
                this.controlDotElement.id = 'scrollbar-control-dot';

                // 设置圆点的CSS样式
                this.controlDotElement.style.cssText = `
                    position: fixed !important;
                    bottom: 20px !important;
                    right: 20px !important;
                    width: 16px !important;
                    height: 16px !important;
                    background-color: #8B5CF6 !important;
                    border-radius: 50% !important;
                    cursor: pointer !important;
                    z-index: 2147483647 !important;
                    box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3) !important;
                    transition: all 0.3s ease !important;
                    opacity: 0.8 !important;
                    border: none !important;
                    outline: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    box-sizing: border-box !important;
                `;

                // 添加悬停效果
                this.controlDotElement.addEventListener('mouseenter', () => {
                    this.controlDotElement.style.opacity = '1';
                    this.controlDotElement.style.transform = 'scale(1.1)';
                    this.controlDotElement.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.5)';
                });

                this.controlDotElement.addEventListener('mouseleave', () => {
                    this.controlDotElement.style.opacity = '0.8';
                    this.controlDotElement.style.transform = 'scale(1)';
                    this.controlDotElement.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.3)';
                });

                // 添加点击事件监听器
                this.controlDotElement.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    this.togglePanel();
                });

                // 将圆点添加到页面
                document.body.appendChild(this.controlDotElement);

                console.log('[UIController] 控制圆点已创建');
            } catch (error) {
                console.error('[UIController] 创建控制圆点失败:', error);
                throw error;
            }
        }

        /**
         * 创建控制面板
         */
        createControlPanel() {
            if (this.controlPanelElement) {
                return; // 避免重复创建
            }

            try {
                // 创建面板容器
                this.controlPanelElement = document.createElement('div');
                this.controlPanelElement.id = 'scrollbar-control-panel';

                // 设置面板的CSS样式
                this.controlPanelElement.style.cssText = `
                    position: fixed !important;
                    bottom: 45px !important;
                    right: 20px !important;
                    width: 200px !important;
                    background: #ffffff !important;
                    border-radius: 12px !important;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15) !important;
                    z-index: 2147483646 !important;
                    padding: 16px !important;
                    display: none !important;
                    opacity: 0 !important;
                    transform: translateY(10px) !important;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                    border: 1px solid #e5e7eb !important;
                    backdrop-filter: blur(10px) !important;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                    font-size: 14px !important;
                    line-height: 1.4 !important;
                    color: #374151 !important;
                    box-sizing: border-box !important;
                    margin: 0 !important;
                `;

                // 创建面板标题
                const panelTitle = document.createElement('div');
                panelTitle.textContent = '滚动条控制';
                panelTitle.style.cssText = `
                    font-weight: 600 !important;
                    font-size: 16px !important;
                    color: #1f2937 !important;
                    margin-bottom: 12px !important;
                    text-align: center !important;
                    padding: 0 !important;
                    border: none !important;
                    background: none !important;
                `;

                // 创建选项容器
                const optionsContainer = document.createElement('div');
                optionsContainer.id = 'scrollbar-options-container';
                optionsContainer.style.cssText = `
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 8px !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: none !important;
                    background: none !important;
                `;

                // 将标题和选项容器添加到面板
                this.controlPanelElement.appendChild(panelTitle);
                this.controlPanelElement.appendChild(optionsContainer);

                // 将面板添加到页面
                document.body.appendChild(this.controlPanelElement);

                console.log('[UIController] 控制面板已创建');
            } catch (error) {
                console.error('[UIController] 创建控制面板失败:', error);
                throw error;
            }
        }

        /**
         * 显示控制面板
         */
        showPanel() {
            if (!this.controlPanelElement) {
                this.createControlPanel();
            }

            try {
                this.controlPanelElement.style.display = 'block';

                // 使用兼容的动画方法
                this.handleBrowserAnimation(() => {
                    this.controlPanelElement.style.opacity = '1';
                    this.controlPanelElement.style.transform = 'translateY(0)';
                });

                this.panelVisible = true;
                console.log('[UIController] 控制面板已显示');
            } catch (error) {
                console.error('[UIController] 显示控制面板失败:', error);
            }
        }

        /**
         * 隐藏控制面板
         */
        hidePanel() {
            if (!this.controlPanelElement) {
                return;
            }

            try {
                this.controlPanelElement.style.opacity = '0';
                this.controlPanelElement.style.transform = 'translateY(10px)';

                // 延迟隐藏元素
                setTimeout(() => {
                    if (this.controlPanelElement) {
                        this.controlPanelElement.style.display = 'none';
                    }
                }, 300);

                this.panelVisible = false;
                console.log('[UIController] 控制面板已隐藏');
            } catch (error) {
                console.error('[UIController] 隐藏控制面板失败:', error);
            }
        }

        /**
         * 切换控制面板显示状态
         */
        togglePanel() {
            if (this.panelVisible) {
                this.hidePanel();
            } else {
                this.showPanel();
            }
        }

        /**
         * 设置document级别的点击事件处理器
         */
        setupDocumentClickHandler() {
            // 创建点击事件处理函数
            this.documentClickHandler = (event) => {
                // 如果面板不可见，不需要处理
                if (!this.panelVisible) {
                    return;
                }

                // 检查点击是否在控制圆点或控制面板内部
                const clickedElement = event.target || event.srcElement; // IE兼容
                const isClickOnDot = this.controlDotElement &&
                    (this.controlDotElement.contains ?
                        this.controlDotElement.contains(clickedElement) :
                        this.controlDotElement === clickedElement);
                const isClickOnPanel = this.controlPanelElement &&
                    (this.controlPanelElement.contains ?
                        this.controlPanelElement.contains(clickedElement) :
                        this.controlPanelElement === clickedElement);

                // 如果点击在面板或圆点外部，关闭面板
                if (!isClickOnDot && !isClickOnPanel) {
                    this.hidePanel();
                }
            };

            // 添加document级别的点击事件监听器
            this.addCompatibleEventListener(document, 'click', this.documentClickHandler, true);
            console.log('[UIController] Document点击事件处理器已设置');
        }

        /**
         * 创建三个选项按钮
         */
        createOptionButtons() {
            if (!this.controlPanelElement) {
                console.warn('[UIController] 控制面板不存在，无法创建选项按钮');
                return;
            }

            try {
                const optionsContainer = this.controlPanelElement.querySelector('#scrollbar-options-container');
                if (!optionsContainer) {
                    console.error('[UIController] 选项容器不存在');
                    return;
                }

                // 定义三个选项的配置
                const options = [
                    {
                        mode: ScrollbarModes.DEFAULT,
                        label: '默认模式',
                        description: '显示原始滚动条'
                    },
                    {
                        mode: ScrollbarModes.ALWAYS,
                        label: '隐藏模式',
                        description: '永远隐藏滚动条'
                    },
                    {
                        mode: ScrollbarModes.SEMI,
                        label: '智能模式',
                        description: '滚动时显示'
                    }
                ];

                // 创建每个选项按钮
                options.forEach(option => {
                    const optionButton = this.createOptionButton(option);
                    optionsContainer.appendChild(optionButton);
                });

                // 设置默认选中状态
                this.updateButtonStates(ScrollbarModes.DEFAULT);

                console.log('[UIController] 选项按钮已创建');
            } catch (error) {
                console.error('[UIController] 创建选项按钮失败:', error);
            }
        }

        /**
         * 创建单个选项按钮
         * @param {Object} option - 选项配置
         * @returns {HTMLElement} 按钮元素
         */
        createOptionButton(option) {
            // 创建按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'scrollbar-option-button';
            buttonContainer.dataset.mode = option.mode;

            buttonContainer.style.cssText = `
                padding: 12px !important;
                border-radius: 8px !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
                border: 2px solid #e5e7eb !important;
                background: #f9fafb !important;
                margin: 0 !important;
                box-sizing: border-box !important;
            `;

            // 创建标签
            const label = document.createElement('div');
            label.textContent = option.label;
            label.style.cssText = `
                font-weight: 600 !important;
                color: #374151 !important;
                margin-bottom: 4px !important;
                font-size: 14px !important;
                padding: 0 !important;
                border: none !important;
                background: none !important;
            `;

            // 创建描述
            const description = document.createElement('div');
            description.textContent = option.description;
            description.style.cssText = `
                font-size: 12px !important;
                color: #6b7280 !important;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
                background: none !important;
            `;

            // 添加悬停效果
            buttonContainer.addEventListener('mouseenter', () => {
                if (!buttonContainer.classList.contains('selected')) {
                    buttonContainer.style.borderColor = '#d1d5db';
                    buttonContainer.style.backgroundColor = '#f3f4f6';
                }
            });

            buttonContainer.addEventListener('mouseleave', () => {
                if (!buttonContainer.classList.contains('selected')) {
                    buttonContainer.style.borderColor = '#e5e7eb';
                    buttonContainer.style.backgroundColor = '#f9fafb';
                }
            });

            // 添加点击事件处理器
            buttonContainer.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.handleModeChange(option.mode);
            });

            // 将标签和描述添加到按钮容器
            buttonContainer.appendChild(label);
            buttonContainer.appendChild(description);

            return buttonContainer;
        }

        /**
         * 更新按钮选中状态
         * @param {string} selectedMode - 选中的模式
         */
        updateButtonStates(selectedMode) {
            if (!this.controlPanelElement) {
                return;
            }

            try {
                const buttons = this.controlPanelElement.querySelectorAll('.scrollbar-option-button');

                buttons.forEach(button => {
                    const isSelected = button.dataset.mode === selectedMode;

                    if (isSelected) {
                        button.classList.add('selected');
                        button.style.borderColor = '#8B5CF6';
                        button.style.backgroundColor = '#f3f0ff';

                        // 更新标签颜色
                        const label = button.querySelector('div:first-child');
                        if (label) {
                            label.style.color = '#8B5CF6';
                        }
                    } else {
                        button.classList.remove('selected');
                        button.style.borderColor = '#e5e7eb';
                        button.style.backgroundColor = '#f9fafb';

                        // 恢复标签颜色
                        const label = button.querySelector('div:first-child');
                        if (label) {
                            label.style.color = '#374151';
                        }
                    }
                });

                this.currentMode = selectedMode;
                console.log('[UIController] 按钮状态已更新，当前模式:', selectedMode);
            } catch (error) {
                console.error('[UIController] 更新按钮状态失败:', error);
            }
        }

        /**
         * 获取当前模式
         * @returns {string} 当前模式
         */
        getCurrentMode() {
            return this.currentMode;
        }

        /**
         * 处理模式变更
         * @param {string} mode - 新的滚动条模式
         */
        handleModeChange(mode) {
            if (!Object.values(ScrollbarModes).includes(mode)) {
                console.warn('[UIController] 无效的模式:', mode);
                return;
            }

            try {
                // 更新按钮状态
                this.updateButtonStates(mode);

                // 通知StyleManager切换模式
                if (this.styleManager && typeof this.styleManager.setMode === 'function') {
                    const success = this.styleManager.setMode(mode);
                    if (success) {
                        console.log('[UIController] 模式已切换到:', mode);
                    } else {
                        console.error('[UIController] 模式切换失败:', mode);
                    }
                } else {
                    console.error('[UIController] StyleManager不可用');
                }
            } catch (error) {
                console.error('[UIController] 处理模式变更失败:', error);
            }
        }

        /**
         * 检查面板是否可见
         * @returns {boolean} 面板可见状态
         */
        isPanelVisible() {
            return this.panelVisible;
        }

        /**
         * 检查UI兼容性
         * @returns {boolean} 兼容性检查结果
         */
        checkUICompatibility() {
            try {
                // 检查必要的DOM API
                if (!document.createElement) {
                    console.error('[UIController] 不支持document.createElement');
                    return false;
                }

                if (!document.body) {
                    console.error('[UIController] document.body不存在');
                    return false;
                }

                // 检查事件API
                if (!document.addEventListener && !document.attachEvent) {
                    console.error('[UIController] 不支持事件监听');
                    return false;
                }

                // 检查样式支持
                const testElement = document.createElement('div');
                if (!testElement.style) {
                    console.error('[UIController] 不支持样式操作');
                    return false;
                }

                return true;
            } catch (error) {
                console.error('[UIController] UI兼容性检查失败:', error);
                return false;
            }
        }

        /**
         * 处理浏览器兼容的动画
         * @param {Function} callback - 动画回调函数
         */
        handleBrowserAnimation(callback) {
            try {
                if (typeof window.requestAnimationFrame === 'function') {
                    window.requestAnimationFrame(callback);
                } else {
                    // 降级到setTimeout
                    setTimeout(callback, 16);
                }
            } catch (error) {
                console.error('[UIController] 动画处理失败:', error);
                // 直接执行回调作为最后的降级
                try {
                    callback();
                } catch (callbackError) {
                    console.error('[UIController] 动画回调执行失败:', callbackError);
                }
            }
        }

        /**
         * 兼容的事件监听器添加
         * @param {Element} element - 目标元素
         * @param {string} event - 事件名称
         * @param {Function} handler - 事件处理函数
         * @param {boolean|Object} options - 事件选项
         */
        addCompatibleEventListener(element, event, handler, options = false) {
            try {
                if (element.addEventListener) {
                    element.addEventListener(event, handler, options);
                } else if (element.attachEvent) {
                    // IE8及以下版本降级
                    element.attachEvent('on' + event, handler);
                } else {
                    // 最后的降级方案
                    element['on' + event] = handler;
                }
            } catch (error) {
                console.error('[UIController] 添加事件监听器失败:', error);
            }
        }

        /**
         * 兼容的事件监听器移除
         * @param {Element} element - 目标元素
         * @param {string} event - 事件名称
         * @param {Function} handler - 事件处理函数
         * @param {boolean|Object} options - 事件选项
         */
        removeCompatibleEventListener(element, event, handler, options = false) {
            try {
                if (element.removeEventListener) {
                    element.removeEventListener(event, handler, options);
                } else if (element.detachEvent) {
                    // IE8及以下版本降级
                    element.detachEvent('on' + event, handler);
                } else {
                    // 最后的降级方案
                    element['on' + event] = null;
                }
            } catch (error) {
                console.error('[UIController] 移除事件监听器失败:', error);
            }
        }

        /**
         * 清理资源
         */
        cleanup() {
            try {
                // 移除document点击事件监听器
                if (this.documentClickHandler) {
                    this.removeCompatibleEventListener(document, 'click', this.documentClickHandler, true);
                    this.documentClickHandler = null;
                }

                // 移除控制圆点
                if (this.controlDotElement && this.controlDotElement.parentNode) {
                    this.controlDotElement.parentNode.removeChild(this.controlDotElement);
                    this.controlDotElement = null;
                }

                // 移除控制面板
                if (this.controlPanelElement && this.controlPanelElement.parentNode) {
                    this.controlPanelElement.parentNode.removeChild(this.controlPanelElement);
                    this.controlPanelElement = null;
                }

                // 重置状态
                this.panelVisible = false;
                this.currentMode = ScrollbarModes.DEFAULT;

                console.log('[UIController] 资源清理完成');
            } catch (error) {
                console.error('[UIController] 清理过程中发生错误:', error);
            }
        }
    }

    /**
     * ScrollDetector - 检测滚动事件并触发相应的样式变化
     */
    class ScrollDetector {
        constructor(styleManager) {
            this.styleManager = styleManager;
            this.isScrolling = false;
            this.scrollTimeout = null;
            this.scrollHandler = null;
            this.isDetectionActive = false;

            // 配置参数
            this.scrollEndDelay = 1000; // 滚动结束后延迟隐藏的时间（毫秒）

            console.log('[ScrollDetector] 滚动检测器已创建');
        }

        /**
         * 开始滚动检测
         */
        startDetection() {
            if (this.isDetectionActive) {
                return; // 避免重复启动
            }

            try {
                // 创建滚动事件处理函数
                this.scrollHandler = this.createScrollHandler();

                // 添加滚动事件监听器
                window.addEventListener('scroll', this.scrollHandler, { passive: true });

                this.isDetectionActive = true;
                console.log('[ScrollDetector] 滚动检测已启动');
            } catch (error) {
                console.error('[ScrollDetector] 启动滚动检测失败:', error);
            }
        }

        /**
         * 停止滚动检测
         */
        stopDetection() {
            if (!this.isDetectionActive) {
                return;
            }

            try {
                // 移除滚动事件监听器
                if (this.scrollHandler) {
                    window.removeEventListener('scroll', this.scrollHandler);
                    this.scrollHandler = null;
                }

                // 清除滚动超时
                if (this.scrollTimeout) {
                    clearTimeout(this.scrollTimeout);
                    this.scrollTimeout = null;
                }

                // 重置状态
                this.isScrolling = false;
                this.isDetectionActive = false;

                console.log('[ScrollDetector] 滚动检测已停止');
            } catch (error) {
                console.error('[ScrollDetector] 停止滚动检测失败:', error);
            }
        }

        /**
         * 创建滚动事件处理函数
         * @returns {Function} 滚动事件处理函数
         */
        createScrollHandler() {
            return () => {
                try {
                    // 如果不是滚动状态，触发滚动开始
                    if (!this.isScrolling) {
                        this.onScrollStart();
                    }

                    // 清除之前的超时
                    if (this.scrollTimeout) {
                        clearTimeout(this.scrollTimeout);
                    }

                    // 设置新的超时来检测滚动结束
                    this.scrollTimeout = setTimeout(() => {
                        this.onScrollEnd();
                    }, this.scrollEndDelay);

                } catch (error) {
                    console.error('[ScrollDetector] 滚动事件处理失败:', error);
                }
            };
        }

        /**
         * 滚动开始事件处理
         */
        onScrollStart() {
            if (this.isScrolling) {
                return; // 已经在滚动状态
            }

            try {
                this.isScrolling = true;

                // 通知StyleManager显示滚动条（仅在semi模式下）
                if (this.styleManager &&
                    this.styleManager.getCurrentMode() === ScrollbarModes.SEMI &&
                    typeof this.styleManager.showScrollbarForSemi === 'function') {

                    const success = this.styleManager.showScrollbarForSemi();
                    if (success) {
                        console.log('[ScrollDetector] 滚动开始 - 滚动条已显示');
                    }
                }
            } catch (error) {
                console.error('[ScrollDetector] 滚动开始处理失败:', error);
            }
        }

        /**
         * 滚动结束事件处理
         */
        onScrollEnd() {
            if (!this.isScrolling) {
                return; // 不在滚动状态
            }

            try {
                this.isScrolling = false;

                // 清除超时
                if (this.scrollTimeout) {
                    clearTimeout(this.scrollTimeout);
                    this.scrollTimeout = null;
                }

                // 通知StyleManager隐藏滚动条（仅在semi模式下）
                if (this.styleManager &&
                    this.styleManager.getCurrentMode() === ScrollbarModes.SEMI &&
                    typeof this.styleManager.hideScrollbarForSemi === 'function') {

                    const success = this.styleManager.hideScrollbarForSemi();
                    if (success) {
                        console.log('[ScrollDetector] 滚动结束 - 滚动条已隐藏');
                    }
                }
            } catch (error) {
                console.error('[ScrollDetector] 滚动结束处理失败:', error);
            }
        }

        /**
         * 检查是否正在滚动
         * @returns {boolean} 滚动状态
         */
        isCurrentlyScrolling() {
            return this.isScrolling;
        }

        /**
         * 检查检测是否激活
         * @returns {boolean} 检测状态
         */
        isActive() {
            return this.isDetectionActive;
        }

        /**
         * 设置滚动结束延迟时间
         * @param {number} delay - 延迟时间（毫秒）
         */
        setScrollEndDelay(delay) {
            if (typeof delay === 'number' && delay > 0) {
                this.scrollEndDelay = delay;
                console.log('[ScrollDetector] 滚动结束延迟已设置为:', delay, 'ms');
            } else {
                console.warn('[ScrollDetector] 无效的延迟时间:', delay);
            }
        }

        /**
         * 获取滚动结束延迟时间
         * @returns {number} 延迟时间（毫秒）
         */
        getScrollEndDelay() {
            return this.scrollEndDelay;
        }

        /**
         * 清理资源
         */
        cleanup() {
            try {
                // 停止检测
                this.stopDetection();

                // 清理引用
                this.styleManager = null;

                console.log('[ScrollDetector] 资源清理完成');
            } catch (error) {
                console.error('[ScrollDetector] 清理过程中发生错误:', error);
            }
        }
    }

    /**
     * ScrollbarControllerApp - 主应用类整合所有组件
     */
    class ScrollbarControllerApp {
        constructor() {
            this.styleManager = null;
            this.uiController = null;
            this.scrollDetector = null;
            this.isInitialized = false;
            this.isDestroyed = false;

            console.log('[ScrollbarControllerApp] 主应用类已创建');
        }

        /**
         * 初始化应用
         * @returns {Promise<boolean>} 初始化是否成功
         */
        async initialize() {
            if (this.isInitialized || this.isDestroyed) {
                return false;
            }

            try {
                console.log('[ScrollbarControllerApp] 开始初始化应用...');

                // 等待DOM加载完成
                await this.waitForDOMReady();

                // 实例化StyleManager
                this.styleManager = new StyleManager();
                if (!this.styleManager.isReady()) {
                    throw new Error('StyleManager初始化失败');
                }

                // 实例化ScrollDetector并传入StyleManager引用
                this.scrollDetector = new ScrollDetector(this.styleManager);

                // 设置StyleManager的ScrollDetector引用，实现组件间通信
                this.styleManager.setScrollDetector(this.scrollDetector);

                // 实例化UIController并传入StyleManager引用
                this.uiController = new UIController(this.styleManager);

                // 验证所有组件都已正确初始化
                if (!this.validateComponents()) {
                    throw new Error('组件验证失败');
                }

                this.isInitialized = true;
                console.log('[ScrollbarControllerApp] 应用初始化完成');

                return true;

            } catch (error) {
                console.error('[ScrollbarControllerApp] 初始化失败:', error);
                await this.cleanup();
                return false;
            }
        }

        /**
         * 等待DOM加载完成
         * @returns {Promise<void>}
         */
        waitForDOMReady() {
            return new Promise((resolve) => {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', resolve, { once: true });
                } else {
                    resolve();
                }
            });
        }

        /**
         * 验证所有组件是否正确初始化
         * @returns {boolean} 验证结果
         */
        validateComponents() {
            try {
                // 验证StyleManager
                if (!this.styleManager || !this.styleManager.isReady()) {
                    console.error('[ScrollbarControllerApp] StyleManager验证失败');
                    return false;
                }

                // 验证ScrollDetector
                if (!this.scrollDetector) {
                    console.error('[ScrollbarControllerApp] ScrollDetector验证失败');
                    return false;
                }

                // 验证UIController
                if (!this.uiController) {
                    console.error('[ScrollbarControllerApp] UIController验证失败');
                    return false;
                }

                // 验证组件间的引用关系
                if (this.styleManager.scrollDetector !== this.scrollDetector) {
                    console.error('[ScrollbarControllerApp] 组件间引用关系验证失败');
                    return false;
                }

                console.log('[ScrollbarControllerApp] 所有组件验证通过');
                return true;

            } catch (error) {
                console.error('[ScrollbarControllerApp] 组件验证过程中发生错误:', error);
                return false;
            }
        }

        /**
         * 获取StyleManager实例
         * @returns {StyleManager|null} StyleManager实例
         */
        getStyleManager() {
            return this.styleManager;
        }

        /**
         * 获取UIController实例
         * @returns {UIController|null} UIController实例
         */
        getUIController() {
            return this.uiController;
        }

        /**
         * 获取ScrollDetector实例
         * @returns {ScrollDetector|null} ScrollDetector实例
         */
        getScrollDetector() {
            return this.scrollDetector;
        }

        /**
         * 检查应用是否已初始化
         * @returns {boolean} 初始化状态
         */
        isReady() {
            return this.isInitialized && !this.isDestroyed;
        }

        /**
         * 处理组件间通信 - 模式变更通知
         * @param {string} newMode - 新的滚动条模式
         */
        handleModeChange(newMode) {
            if (!this.isReady()) {
                console.warn('[ScrollbarControllerApp] 应用未就绪，无法处理模式变更');
                return;
            }

            try {
                // 通过StyleManager协调模式变更
                if (this.styleManager) {
                    const success = this.styleManager.setMode(newMode);
                    if (success) {
                        console.log('[ScrollbarControllerApp] 模式变更协调完成:', newMode);
                    } else {
                        console.error('[ScrollbarControllerApp] 模式变更协调失败:', newMode);
                    }
                }
            } catch (error) {
                console.error('[ScrollbarControllerApp] 处理模式变更时发生错误:', error);
            }
        }

        /**
         * 清理应用资源
         * @returns {Promise<void>}
         */
        async cleanup() {
            if (this.isDestroyed) {
                return;
            }

            try {
                console.log('[ScrollbarControllerApp] 开始清理应用资源...');

                // 清理UIController
                if (this.uiController) {
                    this.uiController.cleanup();
                    this.uiController = null;
                }

                // 清理ScrollDetector
                if (this.scrollDetector) {
                    this.scrollDetector.cleanup();
                    this.scrollDetector = null;
                }

                // 清理StyleManager
                if (this.styleManager) {
                    this.styleManager.cleanup();
                    this.styleManager = null;
                }

                // 重置状态
                this.isInitialized = false;
                this.isDestroyed = true;

                console.log('[ScrollbarControllerApp] 应用资源清理完成');

            } catch (error) {
                console.error('[ScrollbarControllerApp] 清理过程中发生错误:', error);
            }
        }
    }

    /**
     * 脚本初始化函数
     */
    function initializeScript() {
        if (scriptInitialized) {
            console.log('[滚动条控制器] 脚本已初始化，跳过重复初始化');
            return;
        }

        try {
            console.log('[滚动条控制器] 脚本开始初始化...');

            // 检查页面是否已经加载完成
            if (document.readyState === 'loading') {
                console.log('[滚动条控制器] 等待DOM加载完成...');
                document.addEventListener('DOMContentLoaded', initializeScript, { once: true });
                return;
            }

            // 检查基本环境
            if (!document.body) {
                console.warn('[滚动条控制器] document.body不存在，延迟初始化...');
                setTimeout(initializeScript, 100);
                return;
            }

            // 标记脚本已初始化
            scriptInitialized = true;

            console.log('[滚动条控制器] 环境检查通过，开始创建应用实例...');

            // 创建主应用实例
            const app = new ScrollbarControllerApp();

            // 初始化应用
            app.initialize().then(success => {
                if (success) {
                    console.log('[滚动条控制器] 应用启动成功');

                    // 注册清理函数
                    addCleanupFunction(() => app.cleanup());

                    // 将应用实例暴露到全局
                    window.ScrollbarControllerApp = app;

                    // 验证应用状态
                    if (app.isReady()) {
                        console.log('[滚动条控制器] 应用状态验证通过');
                    } else {
                        console.warn('[滚动条控制器] 应用状态验证失败');
                    }

                } else {
                    console.error('[滚动条控制器] 应用启动失败，尝试恢复...');
                    handleInitializationFailure();
                }
            }).catch(error => {
                console.error('[滚动条控制器] 应用启动异常:', error);
                handleInitializationFailure();
            });

        } catch (error) {
            console.error('[滚动条控制器] 初始化过程中发生异常:', error);
            handleInitializationFailure();
        }
    }

    /**
     * 处理初始化失败
     */
    function handleInitializationFailure() {
        try {
            console.log('[滚动条控制器] 处理初始化失败...');

            // 重置初始化状态
            scriptInitialized = false;

            // 清理可能已创建的资源
            cleanupScript();

            // 延迟重试初始化
            setTimeout(() => {
                console.log('[滚动条控制器] 尝试重新初始化...');
                initializeScript();
            }, 2000);

        } catch (error) {
            console.error('[滚动条控制器] 初始化失败处理异常:', error);
        }
    }

    /**
     * 检查脚本运行环境
     * @returns {boolean} 环境是否满足要求
     */
    function checkEnvironment() {
        try {
            // 检查基本API
            if (typeof document === 'undefined') {
                console.error('[滚动条控制器] document对象不存在');
                return false;
            }

            if (typeof window === 'undefined') {
                console.error('[滚动条控制器] window对象不存在');
                return false;
            }

            // 检查必要的DOM API
            if (!document.createElement) {
                console.error('[滚动条控制器] 不支持document.createElement');
                return false;
            }

            if (!document.head && !document.documentElement) {
                console.error('[滚动条控制器] 缺少document.head或document.documentElement');
                return false;
            }

            // 检查事件API（兼容IE）
            if (!document.addEventListener && !document.attachEvent) {
                console.error('[滚动条控制器] 不支持事件监听');
                return false;
            }

            // 检查CSS支持（兼容IE）
            if (!window.getComputedStyle && !document.documentElement.currentStyle) {
                console.error('[滚动条控制器] 不支持样式计算');
                return false;
            }

            // 检查基本的浏览器特性
            const testElement = document.createElement('div');
            if (!testElement.style) {
                console.error('[滚动条控制器] 不支持样式操作');
                return false;
            }

            // 检查navigator对象
            if (!navigator || !navigator.userAgent) {
                console.warn('[滚动条控制器] navigator信息不完整，但继续运行');
            }

            console.log('[滚动条控制器] 环境检查通过');
            return true;

        } catch (error) {
            console.error('[滚动条控制器] 环境检查异常:', error);
            return false;
        }
    }

    /**
     * 安全的脚本启动函数
     */
    function safeStartScript() {
        try {
            // 检查运行环境
            if (!checkEnvironment()) {
                console.error('[滚动条控制器] 环境检查失败，脚本无法启动');
                return;
            }

            // 开始初始化
            initializeScript();

        } catch (error) {
            console.error('[滚动条控制器] 脚本启动失败:', error);
        }
    }

    /**
     * 添加清理函数
     * @param {Function} cleanupFn - 清理函数
     */
    function addCleanupFunction(cleanupFn) {
        if (typeof cleanupFn === 'function') {
            cleanupFunctions.push(cleanupFn);
        }
    }

    /**
     * 脚本清理函数
     */
    function cleanupScript() {
        try {
            console.log('[滚动条控制器] 开始清理脚本资源...');

            // 执行所有注册的清理函数
            cleanupFunctions.forEach((cleanupFn, index) => {
                try {
                    if (typeof cleanupFn === 'function') {
                        cleanupFn();
                        console.log(`[滚动条控制器] 清理函数 ${index + 1} 执行成功`);
                    }
                } catch (error) {
                    console.error(`[滚动条控制器] 清理函数 ${index + 1} 执行失败:`, error);
                }
            });

            // 清空清理函数数组
            cleanupFunctions.length = 0;

            // 重置初始化状态
            scriptInitialized = false;

            // 清理全局引用
            if (window.ScrollbarControllerApp) {
                delete window.ScrollbarControllerApp;
            }
            if (window.ScrollbarController) {
                delete window.ScrollbarController;
            }

            console.log('[滚动条控制器] 脚本清理完成');

        } catch (error) {
            console.error('[滚动条控制器] 清理过程中发生错误:', error);
        }
    }

    /**
     * 页面卸载时的清理处理
     */
    function handlePageUnload() {
        try {
            console.log('[滚动条控制器] 页面卸载，开始清理...');
            cleanupScript();
        } catch (error) {
            console.error('[滚动条控制器] 页面卸载清理失败:', error);
        }
    }

    /**
     * 页面可见性变化处理
     */
    function handleVisibilityChange() {
        try {
            if (document.hidden) {
                console.log('[滚动条控制器] 页面隐藏');
                // 页面隐藏时可以暂停某些功能以节省资源
            } else {
                console.log('[滚动条控制器] 页面显示');
                // 页面显示时恢复功能
            }
        } catch (error) {
            console.error('[滚动条控制器] 页面可见性变化处理失败:', error);
        }
    }

    /**
     * 全局错误处理器
     */
    function handleGlobalError(event) {
        try {
            console.error('[滚动条控制器] 捕获到全局错误:', event.error);

            // 如果是脚本相关的错误，尝试恢复
            if (event.error && event.error.stack &&
                event.error.stack.includes('ScrollbarController')) {
                console.log('[滚动条控制器] 检测到脚本相关错误，尝试恢复...');

                // 尝试重新初始化
                setTimeout(() => {
                    try {
                        if (!scriptInitialized) {
                            console.log('[滚动条控制器] 尝试重新初始化脚本...');
                            initializeScript();
                        }
                    } catch (recoveryError) {
                        console.error('[滚动条控制器] 错误恢复失败:', recoveryError);
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('[滚动条控制器] 全局错误处理器异常:', error);
        }
    }

    /**
     * 未处理的Promise拒绝处理器
     */
    function handleUnhandledRejection(event) {
        try {
            console.error('[滚动条控制器] 捕获到未处理的Promise拒绝:', event.reason);

            // 防止默认的错误处理
            event.preventDefault();
        } catch (error) {
            console.error('[滚动条控制器] Promise拒绝处理器异常:', error);
        }
    }

    // 注册页面卸载事件监听器
    window.addEventListener('beforeunload', handlePageUnload);
    window.addEventListener('unload', handlePageUnload);

    // 注册页面可见性变化监听器
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 注册全局错误处理器
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // 暴露全局接口供其他组件使用
    window.ScrollbarController = {
        addCleanupFunction: addCleanupFunction,
        isInitialized: () => scriptInitialized,
        restart: () => {
            console.log('[滚动条控制器] 手动重启脚本...');
            cleanupScript();
            setTimeout(safeStartScript, 500);
        }
    };

    // 安全启动脚本
    safeStartScript();

})();
