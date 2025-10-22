/**
 * BrowserDetector - 浏览器检测和兼容性处理工具类
 *
 * 提供浏览器类型检测、特性检测和兼容性报告功能
 * 支持主流浏览器的识别和特性检测
 */
export class BrowserDetector {
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
            } else if (ua.includes('edg')) {
                // Edge (Chromium-based)
                browser.name = 'edge';
                browser.engine = 'blink';
                browser.isBlink = true;
                browser.isWebkit = true;
                const match = ua.match(/edg\/(\d+)/);
                if (match) browser.version = match[1];
            } else if (ua.includes('firefox')) {
                // Firefox
                browser.name = 'firefox';
                browser.engine = 'gecko';
                browser.isGecko = true;
                const match = ua.match(/firefox\/(\d+)/);
                if (match) browser.version = match[1];
            } else if (ua.includes('safari') && !ua.includes('chrome')) {
                // Safari
                browser.name = 'safari';
                browser.engine = 'webkit';
                browser.isWebkit = true;
                const match = ua.match(/version\/(\d+)/);
                if (match) browser.version = match[1];
            } else if (ua.includes('trident') || ua.includes('msie')) {
                // Internet Explorer
                browser.name = 'ie';
                browser.engine = 'trident';
                browser.isTrident = true;
                const match = ua.match(/(?:msie |rv:)(\d+)/);
                if (match) browser.version = match[1];
            } else if (ua.includes('opr') || ua.includes('opera')) {
                // Opera
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
            features.webkitScrollbar =
                testElement.style.cssText.includes('webkit-scrollbar') || this.browserInfo.isWebkit;

            // 检测Firefox scrollbar-width支持
            features.scrollbarWidth =
                'scrollbarWidth' in document.documentElement.style || this.browserInfo.isGecko;

            // 检测IE/Edge -ms-overflow-style支持
            features.msOverflowStyle =
                'msOverflowStyle' in document.documentElement.style || this.browserInfo.isTrident;

            // 检测CSS自定义属性支持
            features.cssCustomProperties =
                window.CSS && window.CSS.supports && window.CSS.supports('--test', '0');

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
        const version = parseInt(this.browserInfo.version, 10);

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
