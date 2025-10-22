import { EventBus } from './EventBus.js';
import { PluginManager } from './PluginManager.js';

/**
 * Application - 主应用类
 * 应用程序的主入口和生命周期管理，协调各个管理器和组件
 */
export class Application {
    constructor() {
        this.initialized = false;
        this.destroyed = false;
        this.managers = new Map();
        this.state = {
            currentMode: 'default',
            autoScrollEnabled: false,
            autoScrollSpeed: 3,
            uiVisible: false
        };

        // 初始化核心系统
        this.eventBus = new EventBus();
        this.pluginManager = new PluginManager(this.eventBus);
        this.pluginManager.setApplication(this);

        // 注册核心管理器
        this.managers.set('plugin', this.pluginManager);
        this.managers.set('event', this.eventBus);

        // 绑定错误处理
        this._setupErrorHandling();
    }

    /**
     * 初始化应用程序
     * @param {object} config - 配置选项
     * @returns {Promise<Application>} 返回自身以支持链式调用
     */
    async initialize(config = {}) {
        if (this.initialized) {
            console.warn('[Application] Application is already initialized');
            return this;
        }

        if (this.destroyed) {
            throw new Error('Cannot initialize a destroyed application');
        }

        try {
            console.log('[Application] Initializing application...');

            // 合并配置
            this.config = this._mergeConfig(config);

            // 设置调试模式
            if (this.config.debug) {
                this.eventBus.setDebugMode(true);
                this.pluginManager.setDebugMode(true);
            }

            // 发布初始化开始事件
            this.eventBus.emit('app:init-start', { application: this });

            // 初始化各个管理器
            await this._initializeManagers();

            // 初始化插件系统
            this.pluginManager.initializeAllPlugins();

            // 标记为已初始化
            this.initialized = true;

            console.log('[Application] Application initialized successfully');

            // 发布初始化完成事件
            this.eventBus.emit('app:init-complete', { application: this });

            return this;
        } catch (error) {
            console.error('[Application] Failed to initialize application:', error);

            // 发布初始化失败事件
            this.eventBus.emit('app:init-error', {
                application: this,
                error: error
            });

            throw error;
        }
    }

    /**
     * 销毁应用程序
     * @returns {Promise<void>}
     */
    async destroy() {
        if (this.destroyed) {
            console.warn('[Application] Application is already destroyed');
            return;
        }

        try {
            console.log('[Application] Destroying application...');

            // 发布销毁开始事件
            this.eventBus.emit('app:destroy-start', { application: this });

            // 销毁插件系统
            this.pluginManager.destroyAllPlugins();

            // 销毁各个管理器
            await this._destroyManagers();

            // 清理状态
            this.managers.clear();
            this.state = {};
            this.config = {};

            // 最后销毁事件系统
            this.eventBus.emit('app:destroy-complete', { application: this });
            this.eventBus.destroy();

            // 标记为已销毁
            this.initialized = false;
            this.destroyed = true;

            console.log('[Application] Application destroyed successfully');
        } catch (error) {
            console.error('[Application] Error during application destruction:', error);
            throw error;
        }
    }

    /**
     * 获取管理器实例
     * @param {string} name - 管理器名称
     * @returns {object|null} 管理器实例
     */
    getManager(name) {
        return this.managers.get(name) || null;
    }

    /**
     * 注册管理器
     * @param {string} name - 管理器名称
     * @param {object} manager - 管理器实例
     * @returns {Application} 返回自身以支持链式调用
     */
    registerManager(name, manager) {
        if (this.managers.has(name)) {
            throw new Error(`Manager "${name}" is already registered`);
        }

        this.managers.set(name, manager);

        // 如果管理器有初始化方法且应用已初始化，立即初始化
        if (this.initialized && typeof manager.initialize === 'function') {
            manager.initialize(this);
        }

        console.log(`[Application] Manager registered: ${name}`);
        this.eventBus.emit('manager:register', { name, manager });

        return this;
    }

    /**
     * 注销管理器
     * @param {string} name - 管理器名称
     * @returns {boolean} 是否成功注销
     */
    unregisterManager(name) {
        const manager = this.managers.get(name);
        if (!manager) {
            return false;
        }

        // 如果管理器有销毁方法，调用它
        if (typeof manager.destroy === 'function') {
            try {
                manager.destroy();
            } catch (error) {
                console.error(`[Application] Error destroying manager "${name}":`, error);
            }
        }

        this.managers.delete(name);
        console.log(`[Application] Manager unregistered: ${name}`);
        this.eventBus.emit('manager:unregister', { name, manager });

        return true;
    }

    /**
     * 获取事件总线实例
     * @returns {EventBus} 事件总线实例
     */
    getEventBus() {
        return this.eventBus;
    }

    /**
     * 获取插件管理器实例
     * @returns {PluginManager} 插件管理器实例
     */
    getPluginManager() {
        return this.pluginManager;
    }

    /**
     * 注册插件
     * @param {object} plugin - 插件实例
     * @returns {Application} 返回自身以支持链式调用
     */
    registerPlugin(plugin) {
        this.pluginManager.registerPlugin(plugin);
        return this;
    }

    /**
     * 发布事件
     * @param {string} event - 事件名称
     * @param {any} data - 事件数据
     * @returns {Application} 返回自身以支持链式调用
     */
    emit(event, data) {
        this.eventBus.emit(event, data);
        return this;
    }

    /**
     * 订阅事件
     * @param {string} event - 事件名称
     * @param {function} handler - 事件处理函数
     * @returns {Application} 返回自身以支持链式调用
     */
    on(event, handler) {
        this.eventBus.on(event, handler);
        return this;
    }

    /**
     * 取消订阅事件
     * @param {string} event - 事件名称
     * @param {function} handler - 事件处理函数
     * @returns {Application} 返回自身以支持链式调用
     */
    off(event, handler) {
        this.eventBus.off(event, handler);
        return this;
    }

    /**
     * 获取应用程序状态
     * @returns {object} 应用程序状态
     */
    getState() {
        return { ...this.state };
    }

    /**
     * 更新应用程序状态
     * @param {object} newState - 新状态
     * @returns {Application} 返回自身以支持链式调用
     */
    setState(newState) {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...newState };

        this.eventBus.emit('app:state-change', {
            oldState,
            newState: this.state,
            changes: newState
        });

        return this;
    }

    /**
     * 获取配置
     * @returns {object} 应用程序配置
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * 检查应用程序是否已初始化
     * @returns {boolean} 是否已初始化
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * 检查应用程序是否已销毁
     * @returns {boolean} 是否已销毁
     */
    isDestroyed() {
        return this.destroyed;
    }

    /**
     * 合并配置
     * @private
     * @param {object} userConfig - 用户配置
     * @returns {object} 合并后的配置
     */
    _mergeConfig(userConfig) {
        const defaultConfig = {
            debug: false,
            scrollbar: {
                modes: ['default', 'always', 'semi'],
                defaultMode: 'default'
            },
            autoScroll: {
                minSpeed: 1,
                maxSpeed: 10,
                defaultSpeed: 3,
                frameRate: 60
            },
            ui: {
                dotSize: 20,
                panelWidth: 200,
                zIndex: 999999
            },
            extensions: {
                enabled: true,
                autoLoad: true
            }
        };

        return this._deepMerge(defaultConfig, userConfig);
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
            if (source.hasOwnProperty(key)) {
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
     * 初始化各个管理器
     * @private
     */
    async _initializeManagers() {
        // 按顺序初始化管理器
        const initOrder = ['style', 'ui', 'autoScroll', 'keyboard'];

        for (const managerName of initOrder) {
            const manager = this.managers.get(managerName);
            if (manager && typeof manager.initialize === 'function') {
                try {
                    await manager.initialize(this);
                    console.log(`[Application] Manager initialized: ${managerName}`);
                } catch (error) {
                    console.error(
                        `[Application] Failed to initialize manager "${managerName}":`,
                        error
                    );
                    throw error;
                }
            }
        }
    }

    /**
     * 销毁各个管理器
     * @private
     */
    async _destroyManagers() {
        // 按相反顺序销毁管理器
        const destroyOrder = ['keyboard', 'autoScroll', 'ui', 'style'];

        for (const managerName of destroyOrder) {
            const manager = this.managers.get(managerName);
            if (manager && typeof manager.destroy === 'function') {
                try {
                    await manager.destroy();
                    console.log(`[Application] Manager destroyed: ${managerName}`);
                } catch (error) {
                    console.error(
                        `[Application] Error destroying manager "${managerName}":`,
                        error
                    );
                }
            }
        }

        // 最后销毁插件管理器
        this.pluginManager.destroy();
    }

    /**
     * 设置错误处理
     * @private
     */
    _setupErrorHandling() {
        // 监听全局错误
        this.eventBus.on('error', errorData => {
            console.error('[Application] Global error:', errorData);
        });

        // 监听插件错误
        this.eventBus.on('plugin:error', errorData => {
            console.error('[Application] Plugin error:', errorData);
        });

        // 监听未捕获的Promise拒绝
        if (typeof window !== 'undefined') {
            window.addEventListener('unhandledrejection', event => {
                console.error('[Application] Unhandled promise rejection:', event.reason);
                this.eventBus.emit('error', {
                    type: 'unhandled-rejection',
                    reason: event.reason
                });
            });
        }
    }
}
