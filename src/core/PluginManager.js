/**
 * PluginManager - 插件管理器
 * 管理插件的注册、加载、卸载和生命周期
 */
export class PluginManager {
    constructor(eventBus) {
        if (!eventBus) {
            throw new Error('PluginManager requires an EventBus instance');
        }

        this.eventBus = eventBus;
        this.plugins = new Map();
        this.pluginStates = new Map();
        this.application = null;
        this.debugMode = false;
    }

    /**
     * 设置应用程序实例
     * @param {Application} application - 应用程序实例
     */
    setApplication(application) {
        this.application = application;
        return this;
    }

    /**
     * 注册插件
     * @param {object} plugin - 插件实例
     * @returns {PluginManager} 返回自身以支持链式调用
     */
    registerPlugin(plugin) {
        // 验证插件接口
        this._validatePlugin(plugin);

        if (this.plugins.has(plugin.id)) {
            throw new Error(`Plugin with id "${plugin.id}" is already registered`);
        }

        try {
            // 注册插件
            this.plugins.set(plugin.id, plugin);
            this.pluginStates.set(plugin.id, 'registered');

            if (this.debugMode) {
                console.log(
                    `[PluginManager] Plugin registered: ${plugin.id} (${plugin.name} v${plugin.version})`
                );
            }

            // 发布插件注册事件
            this.eventBus.emit('plugin:register', {
                plugin: plugin,
                manager: this
            });

            // 如果应用程序已经初始化，立即初始化插件
            if (this.application) {
                this._initializePlugin(plugin);
            }
        } catch (error) {
            // 清理失败的注册
            this.plugins.delete(plugin.id);
            this.pluginStates.delete(plugin.id);

            console.error(`[PluginManager] Failed to register plugin "${plugin.id}":`, error);
            throw error;
        }

        return this;
    }

    /**
     * 卸载插件
     * @param {string} pluginId - 插件ID
     * @returns {boolean} 是否成功卸载
     */
    unregisterPlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            console.warn(`[PluginManager] Plugin "${pluginId}" not found`);
            return false;
        }

        try {
            // 销毁插件
            this._destroyPlugin(plugin);

            // 移除插件
            this.plugins.delete(pluginId);
            this.pluginStates.delete(pluginId);

            if (this.debugMode) {
                console.log(`[PluginManager] Plugin unregistered: ${pluginId}`);
            }

            // 发布插件卸载事件
            this.eventBus.emit('plugin:unregister', {
                pluginId: pluginId,
                plugin: plugin,
                manager: this
            });

            return true;
        } catch (error) {
            console.error(`[PluginManager] Failed to unregister plugin "${pluginId}":`, error);
            return false;
        }
    }

    /**
     * 获取插件实例
     * @param {string} pluginId - 插件ID
     * @returns {object|null} 插件实例
     */
    getPlugin(pluginId) {
        return this.plugins.get(pluginId) || null;
    }

    /**
     * 获取插件状态
     * @param {string} pluginId - 插件ID
     * @returns {string|null} 插件状态
     */
    getPluginState(pluginId) {
        return this.pluginStates.get(pluginId) || null;
    }

    /**
     * 获取所有已注册的插件
     * @returns {Array} 插件信息数组
     */
    getAllPlugins() {
        return Array.from(this.plugins.entries()).map(([id, plugin]) => ({
            id: id,
            name: plugin.name,
            version: plugin.version,
            state: this.pluginStates.get(id)
        }));
    }

    /**
     * 初始化所有插件
     * 通常在应用程序启动时调用
     */
    initializeAllPlugins() {
        if (!this.application) {
            throw new Error('Application instance must be set before initializing plugins');
        }

        for (const plugin of this.plugins.values()) {
            if (this.pluginStates.get(plugin.id) === 'registered') {
                this._initializePlugin(plugin);
            }
        }
    }

    /**
     * 销毁所有插件
     * 通常在应用程序关闭时调用
     */
    destroyAllPlugins() {
        for (const plugin of this.plugins.values()) {
            if (this.pluginStates.get(plugin.id) === 'initialized') {
                this._destroyPlugin(plugin);
            }
        }
    }

    /**
     * 动态加载扩展模块
     * 预留接口，用于未来的动态加载功能
     * @param {string} extensionPath - 扩展路径
     */
    async loadExtension(extensionPath) {
        // 这是一个预留接口，用于未来的动态加载功能
        // 在当前的油猴脚本环境中，我们主要通过静态注册的方式管理插件
        console.warn('[PluginManager] Dynamic extension loading not implemented yet');

        // 发布扩展加载事件
        this.eventBus.emit('extension:load-attempt', {
            path: extensionPath,
            success: false,
            reason: 'Not implemented'
        });
    }

    /**
     * 批量加载扩展模块
     * 预留接口，用于未来的批量动态加载功能
     * @param {Array<string>} extensionPaths - 扩展路径数组
     */
    async loadExtensions(extensionPaths = []) {
        // 这是一个预留接口，用于未来的批量动态加载功能
        console.warn('[PluginManager] Batch extension loading not implemented yet');

        const results = [];
        for (const path of extensionPaths) {
            try {
                await this.loadExtension(path);
                results.push({ path, success: false, reason: 'Not implemented' });
            } catch (error) {
                results.push({ path, success: false, error: error.message });
            }
        }

        // 发布批量扩展加载事件
        this.eventBus.emit('extensions:load-attempt', {
            paths: extensionPaths,
            results: results
        });

        return results;
    }

    /**
     * 启用或禁用调试模式
     * @param {boolean} enabled - 是否启用调试模式
     */
    setDebugMode(enabled) {
        this.debugMode = Boolean(enabled);
        if (this.debugMode) {
            console.log('[PluginManager] Debug mode enabled');
        }
        return this;
    }

    /**
     * 销毁插件管理器
     */
    destroy() {
        if (this.debugMode) {
            console.log('[PluginManager] Destroying PluginManager');
        }

        // 销毁所有插件
        this.destroyAllPlugins();

        // 清理资源
        this.plugins.clear();
        this.pluginStates.clear();
        this.application = null;
    }

    /**
     * 验证插件接口
     * @private
     * @param {object} plugin - 插件实例
     */
    _validatePlugin(plugin) {
        if (!plugin || typeof plugin !== 'object') {
            throw new Error('Plugin must be an object');
        }

        // 必需的属性
        const requiredProps = ['id', 'name', 'version'];
        for (const prop of requiredProps) {
            if (!plugin[prop] || typeof plugin[prop] !== 'string') {
                throw new Error(`Plugin must have a valid "${prop}" property`);
            }
        }

        // 验证ID格式
        if (!/^[a-zA-Z0-9-_]+$/.test(plugin.id)) {
            throw new Error(
                'Plugin id must contain only alphanumeric characters, hyphens, and underscores'
            );
        }

        // 可选的方法
        const optionalMethods = ['initialize', 'destroy', 'getAPI'];
        for (const method of optionalMethods) {
            if (plugin[method] && typeof plugin[method] !== 'function') {
                throw new Error(`Plugin "${method}" must be a function if provided`);
            }
        }
    }

    /**
     * 初始化插件
     * @private
     * @param {object} plugin - 插件实例
     */
    _initializePlugin(plugin) {
        try {
            this.pluginStates.set(plugin.id, 'initializing');

            if (typeof plugin.initialize === 'function') {
                plugin.initialize(this.application);
            }

            this.pluginStates.set(plugin.id, 'initialized');

            if (this.debugMode) {
                console.log(`[PluginManager] Plugin initialized: ${plugin.id}`);
            }

            // 发布插件初始化事件
            this.eventBus.emit('plugin:initialize', {
                plugin: plugin,
                manager: this
            });
        } catch (error) {
            this.pluginStates.set(plugin.id, 'error');
            console.error(`[PluginManager] Failed to initialize plugin "${plugin.id}":`, error);

            // 发布插件错误事件
            this.eventBus.emit('plugin:error', {
                plugin: plugin,
                error: error,
                phase: 'initialize'
            });
        }
    }

    /**
     * 销毁插件
     * @private
     * @param {object} plugin - 插件实例
     */
    _destroyPlugin(plugin) {
        try {
            this.pluginStates.set(plugin.id, 'destroying');

            if (typeof plugin.destroy === 'function') {
                plugin.destroy();
            }

            this.pluginStates.set(plugin.id, 'destroyed');

            if (this.debugMode) {
                console.log(`[PluginManager] Plugin destroyed: ${plugin.id}`);
            }

            // 发布插件销毁事件
            this.eventBus.emit('plugin:destroy', {
                plugin: plugin,
                manager: this
            });
        } catch (error) {
            this.pluginStates.set(plugin.id, 'error');
            console.error(`[PluginManager] Failed to destroy plugin "${plugin.id}":`, error);

            // 发布插件错误事件
            this.eventBus.emit('plugin:error', {
                plugin: plugin,
                error: error,
                phase: 'destroy'
            });
        }
    }
}
