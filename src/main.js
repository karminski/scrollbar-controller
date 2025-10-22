/**
 * main.js - 应用程序主入口文件
 * 创建应用程序的启动入口，初始化所有核心模块和管理器，实现应用程序的生命周期管理
 */

// 导入核心模块
import { Application } from './core/Application.js';
import { BrowserDetector } from './detectors/BrowserDetector.js';
import { StyleManager } from './managers/StyleManager.js';
import { ScrollDetector } from './detectors/ScrollDetector.js';
import { AutoScrollManager } from './managers/AutoScrollManager.js';
import { KeyboardHandler } from './managers/KeyboardHandler.js';
import { UIController } from './ui/UIController.js';

// 导入工具模块
import { Config, EventTypes } from './utils/constants.js';
import { Logger } from './utils/logger.js';

/**
 * 应用程序主类
 * 负责协调所有模块的初始化和生命周期管理
 */
class ScrollbarControllerApp {
    constructor() {
        this.app = null;
        this.initialized = false;
        this.logger = new Logger('ScrollbarControllerApp');
    }

    /**
     * 初始化应用程序
     * @param {object} config - 可选的配置覆盖
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        if (this.initialized) {
            this.logger.warn('Application is already initialized');
            return;
        }

        try {
            this.logger.info('Starting Scrollbar Controller application...');

            // 创建主应用实例
            this.app = new Application();

            // 合并配置
            const appConfig = this._mergeConfig(config);

            // 注册所有管理器
            await this._registerManagers();

            // 初始化应用程序
            await this.app.initialize(appConfig);

            // 验证所有模块的功能完整性
            await this._validateModuleIntegration();

            // 启动所有功能模块
            await this._startAllModules();

            // 设置全局错误处理
            this._setupGlobalErrorHandling();

            // 设置页面卸载处理
            this._setupPageUnloadHandling();

            this.initialized = true;
            this.logger.info('Scrollbar Controller application initialized successfully');

            // 发布应用启动完成事件
            this.app.emit(EventTypes.APP_INIT, {
                timestamp: Date.now(),
                config: appConfig
            });
        } catch (error) {
            this.logger.error('Failed to initialize application:', error);
            throw error;
        }
    }

    /**
     * 销毁应用程序
     * @returns {Promise<void>}
     */
    async destroy() {
        if (!this.initialized || !this.app) {
            this.logger.warn('Application is not initialized or already destroyed');
            return;
        }

        try {
            this.logger.info('Destroying Scrollbar Controller application...');

            // 发布应用销毁开始事件
            this.app.emit(EventTypes.APP_DESTROY, { timestamp: Date.now() });

            // 停止所有功能模块
            await this._stopAllModules();

            // 销毁应用程序
            await this.app.destroy();

            // 清理引用
            this.app = null;
            this.initialized = false;

            this.logger.info('Scrollbar Controller application destroyed successfully');
        } catch (error) {
            this.logger.error('Error during application destruction:', error);
            throw error;
        }
    }

    /**
     * 获取应用程序实例
     * @returns {Application|null}
     */
    getApplication() {
        return this.app;
    }

    /**
     * 检查应用程序是否已初始化
     * @returns {boolean}
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * 注册所有管理器
     * @private
     * @returns {Promise<void>}
     */
    async _registerManagers() {
        try {
            // 创建浏览器检测器（作为依赖项）
            const browserDetector = new BrowserDetector();

            // 创建并注册样式管理器
            const styleManager = new StyleManager(this.app.getEventBus(), browserDetector);
            this.app.registerManager('style', styleManager);

            // 创建滚动检测器（需要样式管理器引用）
            const scrollDetector = new ScrollDetector(this.app.getEventBus(), styleManager);

            // 创建并注册自动滚动管理器
            const autoScrollManager = new AutoScrollManager(this.app.getEventBus());
            this.app.registerManager('autoScroll', autoScrollManager);

            // 创建并注册键盘处理器（需要自动滚动管理器引用）
            const keyboardHandler = new KeyboardHandler(this.app.getEventBus(), autoScrollManager);
            this.app.registerManager('keyboard', keyboardHandler);

            // 创建并注册UI控制器
            const uiController = new UIController(this.app.getEventBus(), styleManager);
            this.app.registerManager('ui', uiController);

            // 建立模块间的依赖关系
            this._establishModuleDependencies(
                styleManager,
                scrollDetector,
                autoScrollManager,
                keyboardHandler,
                uiController
            );

            // 注册检测器作为依赖项（不作为管理器，但可以通过应用访问）
            this.app.browserDetector = browserDetector;
            this.app.scrollDetector = scrollDetector;

            this.logger.info('All managers registered successfully');
        } catch (error) {
            this.logger.error('Failed to register managers:', error);
            throw error;
        }
    }

    /**
     * 建立模块间的依赖关系和通信
     * @private
     * @param {StyleManager} styleManager - 样式管理器
     * @param {ScrollDetector} scrollDetector - 滚动检测器
     * @param {AutoScrollManager} autoScrollManager - 自动滚动管理器
     * @param {KeyboardHandler} keyboardHandler - 键盘处理器
     * @param {UIController} uiController - UI控制器
     */
    _establishModuleDependencies(
        styleManager,
        scrollDetector,
        autoScrollManager,
        keyboardHandler,
        uiController
    ) {
        try {
            // 设置样式管理器的滚动检测器引用
            if (typeof styleManager.setScrollDetector === 'function') {
                styleManager.setScrollDetector(scrollDetector);
            }

            // 设置键盘处理器的自动滚动管理器引用
            if (typeof keyboardHandler.setAutoScrollManager === 'function') {
                keyboardHandler.setAutoScrollManager(autoScrollManager);
            }

            // 建立事件系统的跨模块通信
            this._setupInterModuleCommunication(
                styleManager,
                scrollDetector,
                autoScrollManager,
                keyboardHandler,
                uiController
            );

            this.logger.info('Module dependencies established successfully');
        } catch (error) {
            this.logger.error('Failed to establish module dependencies:', error);
            throw error;
        }
    }

    /**
     * 设置模块间的事件通信
     * @private
     * @param {StyleManager} styleManager - 样式管理器
     * @param {ScrollDetector} scrollDetector - 滚动检测器
     * @param {AutoScrollManager} autoScrollManager - 自动滚动管理器
     * @param {KeyboardHandler} keyboardHandler - 键盘处理器
     * @param {UIController} uiController - UI控制器
     */
    _setupInterModuleCommunication(
        styleManager,
        scrollDetector,
        autoScrollManager,
        keyboardHandler,
        uiController
    ) {
        const eventBus = this.app.getEventBus();

        // UI控制器与样式管理器的通信
        eventBus.on('ui:mode-select', data => {
            if (styleManager && typeof styleManager.setMode === 'function') {
                styleManager.setMode(data.mode);
            }
        });

        // UI控制器与自动滚动管理器的通信
        eventBus.on('ui:speed-change', data => {
            if (autoScrollManager && typeof autoScrollManager.setSpeed === 'function') {
                autoScrollManager.setSpeed(data.speed);
            }
        });

        // UI自动滚动控制事件
        eventBus.on('ui:auto-scroll-start', () => {
            if (autoScrollManager && typeof autoScrollManager.startAutoScroll === 'function') {
                autoScrollManager.startAutoScroll();
            }
        });

        eventBus.on('ui:auto-scroll-stop', () => {
            if (autoScrollManager && typeof autoScrollManager.stopAutoScroll === 'function') {
                autoScrollManager.stopAutoScroll();
            }
        });

        // 键盘处理器与自动滚动管理器的通信
        eventBus.on('keyboard:toggle', () => {
            if (autoScrollManager) {
                if (autoScrollManager.isScrolling) {
                    autoScrollManager.stopAutoScroll();
                } else {
                    autoScrollManager.startAutoScroll();
                }
            }
        });

        // 样式管理器状态变化通知UI
        eventBus.on('style:mode-change', data => {
            if (uiController && typeof uiController.updateMode === 'function') {
                uiController.updateMode(data.mode);
            }
        });

        // 自动滚动状态变化通知UI
        eventBus.on('auto-scroll:start', _data => {
            if (uiController && typeof uiController.updateAutoScrollState === 'function') {
                uiController.updateAutoScrollState(true);
            }
        });

        eventBus.on('auto-scroll:stop', _data => {
            if (uiController && typeof uiController.updateAutoScrollState === 'function') {
                uiController.updateAutoScrollState(false);
            }
        });

        // 滚动检测器与样式管理器的通信（用于semi模式）
        eventBus.on('scroll:start', () => {
            if (styleManager && styleManager.currentMode === 'semi') {
                styleManager.showScrollbar();
            }
        });

        eventBus.on('scroll:end', () => {
            if (styleManager && styleManager.currentMode === 'semi') {
                styleManager.hideScrollbar();
            }
        });

        this.logger.info('Inter-module communication established');
    }

    /**
     * 验证模块集成的完整性
     * @private
     * @returns {Promise<void>}
     */
    async _validateModuleIntegration() {
        try {
            this.logger.info('Validating module integration...');

            // 验证所有管理器是否正确注册
            const requiredManagers = ['style', 'autoScroll', 'keyboard', 'ui'];
            const missingManagers = [];

            for (const managerName of requiredManagers) {
                const manager = this.app.getManager(managerName);
                if (!manager) {
                    missingManagers.push(managerName);
                }
            }

            if (missingManagers.length > 0) {
                throw new Error(`Missing required managers: ${missingManagers.join(', ')}`);
            }

            // 验证检测器是否正确创建
            if (!this.app.browserDetector) {
                throw new Error('BrowserDetector not properly initialized');
            }

            if (!this.app.scrollDetector) {
                throw new Error('ScrollDetector not properly initialized');
            }

            // 验证事件系统是否正常工作
            let eventTestPassed = false;
            const testHandler = () => {
                eventTestPassed = true;
            };

            this.app.on('integration:test', testHandler);
            this.app.emit('integration:test', {});
            this.app.off('integration:test', testHandler);

            if (!eventTestPassed) {
                throw new Error('Event system validation failed');
            }

            // 验证管理器的基本功能
            await this._validateManagerFunctionality();

            this.logger.info('Module integration validation completed successfully');
        } catch (error) {
            this.logger.error('Module integration validation failed:', error);
            throw error;
        }
    }

    /**
     * 验证管理器的基本功能
     * @private
     * @returns {Promise<void>}
     */
    async _validateManagerFunctionality() {
        const styleManager = this.app.getManager('style');
        const autoScrollManager = this.app.getManager('autoScroll');
        const keyboardHandler = this.app.getManager('keyboard');
        const uiController = this.app.getManager('ui');

        // 验证样式管理器
        if (styleManager) {
            if (typeof styleManager.setMode !== 'function') {
                this.logger.warn('StyleManager missing setMode method');
            }
            if (typeof styleManager.showScrollbar !== 'function') {
                this.logger.warn('StyleManager missing showScrollbar method');
            }
            if (typeof styleManager.hideScrollbar !== 'function') {
                this.logger.warn('StyleManager missing hideScrollbar method');
            }
        }

        // 验证自动滚动管理器
        if (autoScrollManager) {
            if (typeof autoScrollManager.enable !== 'function') {
                this.logger.warn('AutoScrollManager missing enable method');
            }
            if (typeof autoScrollManager.startAutoScroll !== 'function') {
                this.logger.warn('AutoScrollManager missing startAutoScroll method');
            }
            if (typeof autoScrollManager.stopAutoScroll !== 'function') {
                this.logger.warn('AutoScrollManager missing stopAutoScroll method');
            }
        }

        // 验证键盘处理器
        if (keyboardHandler) {
            if (typeof keyboardHandler.enable !== 'function') {
                this.logger.warn('KeyboardHandler missing enable method');
            }
        }

        // 验证UI控制器
        if (uiController) {
            if (typeof uiController.initialize !== 'function') {
                this.logger.warn('UIController missing initialize method');
            }
        }

        this.logger.info('Manager functionality validation completed');
    }

    /**
     * 启动所有功能模块
     * @private
     * @returns {Promise<void>}
     */
    async _startAllModules() {
        try {
            this.logger.info('Starting all modules...');

            // 启动样式管理器
            const styleManager = this.app.getManager('style');
            if (styleManager && typeof styleManager.enable === 'function') {
                styleManager.enable();
            }

            // 启动自动滚动管理器
            const autoScrollManager = this.app.getManager('autoScroll');
            if (autoScrollManager && typeof autoScrollManager.enable === 'function') {
                autoScrollManager.enable();
            }

            // 启动键盘处理器
            const keyboardHandler = this.app.getManager('keyboard');
            if (keyboardHandler && typeof keyboardHandler.enable === 'function') {
                keyboardHandler.enable();
            }

            // 初始化UI控制器
            const uiController = this.app.getManager('ui');
            if (uiController && typeof uiController.initialize === 'function') {
                uiController.initialize();
            }

            // 启动滚动检测器（如果需要）
            if (
                this.app.scrollDetector &&
                typeof this.app.scrollDetector.startDetection === 'function'
            ) {
                // 只在semi模式下启动滚动检测
                if (styleManager && styleManager.currentMode === 'semi') {
                    this.app.scrollDetector.startDetection();
                }
            }

            this.logger.info('All modules started successfully');
        } catch (error) {
            this.logger.error('Failed to start modules:', error);
            throw error;
        }
    }

    /**
     * 停止所有功能模块
     * @private
     * @returns {Promise<void>}
     */
    async _stopAllModules() {
        try {
            this.logger.info('Stopping all modules...');

            // 停止滚动检测器
            if (
                this.app.scrollDetector &&
                typeof this.app.scrollDetector.stopDetection === 'function'
            ) {
                this.app.scrollDetector.stopDetection();
            }

            // 停止键盘处理器
            const keyboardHandler = this.app.getManager('keyboard');
            if (keyboardHandler && typeof keyboardHandler.disable === 'function') {
                keyboardHandler.disable();
            }

            // 停止自动滚动管理器
            const autoScrollManager = this.app.getManager('autoScroll');
            if (autoScrollManager) {
                if (typeof autoScrollManager.stopAutoScroll === 'function') {
                    autoScrollManager.stopAutoScroll();
                }
                if (typeof autoScrollManager.disable === 'function') {
                    autoScrollManager.disable();
                }
            }

            // 销毁UI控制器
            const uiController = this.app.getManager('ui');
            if (uiController && typeof uiController.destroy === 'function') {
                uiController.destroy();
            }

            // 清理样式管理器
            const styleManager = this.app.getManager('style');
            if (styleManager && typeof styleManager.cleanup === 'function') {
                styleManager.cleanup();
            }

            this.logger.info('All modules stopped successfully');
        } catch (error) {
            this.logger.error('Error stopping modules:', error);
            throw error;
        }
    }

    /**
     * 合并配置
     * @private
     * @param {object} userConfig - 用户配置
     * @returns {object} 合并后的配置
     */
    _mergeConfig(userConfig) {
        // 使用深度合并来组合默认配置和用户配置
        return this._deepMerge(Config, userConfig);
    }

    /**
     * 深度合并对象
     * @private
     * @param {object} target - 目标对象
     * @param {object} source - 源对象
     * @returns {object} 合并后的对象
     */
    _deepMerge(target, source) {
        const result = { ...target };

        for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = this._deepMerge(result[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }

        return result;
    }

    /**
     * 设置全局错误处理
     * @private
     */
    _setupGlobalErrorHandling() {
        // 监听应用程序错误事件
        this.app.on('error', errorData => {
            this.logger.error('Application error:', errorData);
        });

        // 监听插件错误事件
        this.app.on('plugin:error', errorData => {
            this.logger.error('Plugin error:', errorData);
        });

        // 监听管理器错误事件
        this.app.on('manager:error', errorData => {
            this.logger.error('Manager error:', errorData);
        });

        // 全局错误处理
        if (typeof window !== 'undefined') {
            window.addEventListener('error', event => {
                this.logger.error('Global JavaScript error:', {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    error: event.error
                });
            });

            window.addEventListener('unhandledrejection', event => {
                this.logger.error('Unhandled promise rejection:', event.reason);
                this.app?.emit('error', {
                    type: 'unhandled-rejection',
                    reason: event.reason
                });
            });
        }
    }

    /**
     * 设置页面卸载处理
     * @private
     */
    _setupPageUnloadHandling() {
        if (typeof window !== 'undefined') {
            // 页面卸载时清理资源
            window.addEventListener('beforeunload', () => {
                if (this.initialized) {
                    this.logger.info('Page unloading, cleaning up application...');
                    // 同步销毁（因为beforeunload不支持异步）
                    try {
                        this.app?.destroy();
                    } catch (error) {
                        this.logger.error('Error during page unload cleanup:', error);
                    }
                }
            });

            // 页面隐藏时暂停某些功能
            document.addEventListener('visibilitychange', () => {
                if (this.app && this.initialized) {
                    if (document.hidden) {
                        this.app.emit('app:page-hidden', { timestamp: Date.now() });
                    } else {
                        this.app.emit('app:page-visible', { timestamp: Date.now() });
                    }
                }
            });
        }
    }
}

/**
 * 创建并启动应用程序实例
 * @param {object} config - 可选的配置覆盖
 * @returns {Promise<ScrollbarControllerApp>}
 */
export async function createApp(config = {}) {
    const app = new ScrollbarControllerApp();
    await app.initialize(config);
    return app;
}

/**
 * 应用程序入口点
 * 当作为主模块运行时自动启动应用程序
 */
async function main() {
    try {
        // 检查运行环境
        if (typeof window === 'undefined') {
            console.warn('Scrollbar Controller is designed to run in a browser environment');
            return;
        }

        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve, { once: true });
            });
        }

        // 创建并启动应用程序
        const app = await createApp();

        // 将应用程序实例暴露到全局作用域（用于调试）
        if (typeof window !== 'undefined') {
            window.ScrollbarControllerApp = app;
        }

        console.log('Scrollbar Controller is ready!');
    } catch (error) {
        console.error('Failed to start Scrollbar Controller:', error);
    }
}

// 如果作为主模块运行，自动启动应用程序
if (typeof window !== 'undefined' && document) {
    main().catch(error => {
        console.error('Application startup failed:', error);
    });
}

// 导出主要接口
export { ScrollbarControllerApp };
export default ScrollbarControllerApp;
