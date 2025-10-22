/**
 * EventBus - 事件总线系统
 * 实现发布-订阅模式，提供组件间解耦通信机制
 */
export class EventBus {
    constructor() {
        this.events = new Map();
        this.debugMode = false;
    }

    /**
     * 订阅事件
     * @param {string} event - 事件名称
     * @param {function} handler - 事件处理函数
     * @param {object} options - 选项 { once: boolean }
     */
    on(event, handler, options = {}) {
        if (typeof event !== 'string' || typeof handler !== 'function') {
            throw new Error('EventBus.on: event must be string and handler must be function');
        }

        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }

        const wrappedHandler = options.once
            ? (...args) => {
                  handler(...args);
                  this.off(event, wrappedHandler);
              }
            : handler;

        // 保存原始处理函数的引用，用于取消订阅
        wrappedHandler._originalHandler = handler;

        this.events.get(event).add(wrappedHandler);

        if (this.debugMode) {
            console.log(`[EventBus] Subscribed to event: ${event}`);
        }

        return this;
    }

    /**
     * 取消订阅事件
     * @param {string} event - 事件名称
     * @param {function} handler - 事件处理函数
     */
    off(event, handler) {
        if (!this.events.has(event)) {
            return this;
        }

        const handlers = this.events.get(event);

        // 查找并移除处理函数（包括包装过的处理函数）
        for (const wrappedHandler of handlers) {
            if (wrappedHandler === handler || wrappedHandler._originalHandler === handler) {
                handlers.delete(wrappedHandler);
                break;
            }
        }

        // 如果没有处理函数了，删除事件
        if (handlers.size === 0) {
            this.events.delete(event);
        }

        if (this.debugMode) {
            console.log(`[EventBus] Unsubscribed from event: ${event}`);
        }

        return this;
    }

    /**
     * 订阅一次性事件
     * @param {string} event - 事件名称
     * @param {function} handler - 事件处理函数
     */
    once(event, handler) {
        return this.on(event, handler, { once: true });
    }

    /**
     * 发布事件
     * @param {string} event - 事件名称
     * @param {any} data - 事件数据
     */
    emit(event, data) {
        if (typeof event !== 'string') {
            throw new Error('EventBus.emit: event must be string');
        }

        if (this.debugMode) {
            console.log(`[EventBus] Emitting event: ${event}`, data);
        }

        if (!this.events.has(event)) {
            return this;
        }

        const handlers = this.events.get(event);
        const handlersToCall = Array.from(handlers); // 创建副本避免迭代时修改

        for (const handler of handlersToCall) {
            try {
                handler(data);
            } catch (error) {
                console.error(`[EventBus] Error in event handler for "${event}":`, error);

                // 发布错误事件
                if (event !== 'error') {
                    this.emit('error', {
                        originalEvent: event,
                        error: error,
                        handler: handler
                    });
                }
            }
        }

        return this;
    }

    /**
     * 移除所有事件监听器
     * @param {string} event - 可选，指定事件名称
     */
    removeAllListeners(event) {
        if (event) {
            this.events.delete(event);
            if (this.debugMode) {
                console.log(`[EventBus] Removed all listeners for event: ${event}`);
            }
        } else {
            this.events.clear();
            if (this.debugMode) {
                console.log('[EventBus] Removed all event listeners');
            }
        }
        return this;
    }

    /**
     * 获取事件的监听器数量
     * @param {string} event - 事件名称
     * @returns {number} 监听器数量
     */
    listenerCount(event) {
        return this.events.has(event) ? this.events.get(event).size : 0;
    }

    /**
     * 获取所有事件名称
     * @returns {string[]} 事件名称数组
     */
    eventNames() {
        return Array.from(this.events.keys());
    }

    /**
     * 启用或禁用调试模式
     * @param {boolean} enabled - 是否启用调试模式
     */
    setDebugMode(enabled) {
        this.debugMode = Boolean(enabled);
        if (this.debugMode) {
            console.log('[EventBus] Debug mode enabled');
        }
        return this;
    }

    /**
     * 销毁事件总线，清理所有资源
     */
    destroy() {
        if (this.debugMode) {
            console.log('[EventBus] Destroying EventBus');
        }
        this.removeAllListeners();
    }
}
