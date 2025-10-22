/**
 * 辅助函数模块
 * 提供通用的DOM操作、工具函数和错误处理
 */

/**
 * DOM操作辅助函数
 */
export const DOM = {
    /**
     * 创建DOM元素
     * @param {string} tagName - 标签名
     * @param {Object} attributes - 属性对象
     * @param {string} textContent - 文本内容
     * @returns {HTMLElement} 创建的元素
     */
    createElement(tagName, attributes = {}, textContent = '') {
        try {
            const element = document.createElement(tagName);

            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'style' && typeof value === 'object') {
                    Object.assign(element.style, value);
                } else if (key === 'className') {
                    element.className = value;
                } else {
                    element.setAttribute(key, value);
                }
            });

            if (textContent) {
                element.textContent = textContent;
            }

            return element;
        } catch (error) {
            console.error('Error creating element:', error);
            return null;
        }
    },

    /**
     * 查找元素
     * @param {string} selector - CSS选择器
     * @param {Element} parent - 父元素，默认为document
     * @returns {Element|null} 找到的元素
     */
    querySelector(selector, parent = document) {
        try {
            return parent.querySelector(selector);
        } catch (error) {
            console.error('Error querying selector:', error);
            return null;
        }
    },

    /**
     * 查找多个元素
     * @param {string} selector - CSS选择器
     * @param {Element} parent - 父元素，默认为document
     * @returns {NodeList} 找到的元素列表
     */
    querySelectorAll(selector, parent = document) {
        try {
            return parent.querySelectorAll(selector);
        } catch (error) {
            console.error('Error querying selector all:', error);
            return [];
        }
    },

    /**
     * 添加CSS样式
     * @param {Element} element - 目标元素
     * @param {Object} styles - 样式对象
     */
    setStyles(element, styles) {
        if (!element || typeof styles !== 'object') return;

        try {
            Object.assign(element.style, styles);
        } catch (error) {
            console.error('Error setting styles:', error);
        }
    },

    /**
     * 添加事件监听器
     * @param {Element} element - 目标元素
     * @param {string} event - 事件类型
     * @param {Function} handler - 事件处理函数
     * @param {Object} options - 事件选项
     */
    addEventListener(element, event, handler, options = {}) {
        if (!element || typeof handler !== 'function') return;

        try {
            element.addEventListener(event, handler, options);
        } catch (error) {
            console.error('Error adding event listener:', error);
        }
    },

    /**
     * 移除事件监听器
     * @param {Element} element - 目标元素
     * @param {string} event - 事件类型
     * @param {Function} handler - 事件处理函数
     */
    removeEventListener(element, event, handler) {
        if (!element || typeof handler !== 'function') return;

        try {
            element.removeEventListener(event, handler);
        } catch (error) {
            console.error('Error removing event listener:', error);
        }
    },

    /**
     * 注入CSS样式
     * @param {string} css - CSS代码
     * @param {string} id - 样式标签ID
     * @returns {HTMLStyleElement} 创建的style元素
     */
    injectCSS(css, id = '') {
        try {
            // 如果已存在相同ID的样式，先移除
            if (id) {
                const existing = document.getElementById(id);
                if (existing) {
                    existing.remove();
                }
            }

            const style = document.createElement('style');
            style.textContent = css;
            if (id) {
                style.id = id;
            }

            document.head.appendChild(style);
            return style;
        } catch (error) {
            console.error('Error injecting CSS:', error);
            return null;
        }
    },

    /**
     * 移除CSS样式
     * @param {string} id - 样式标签ID
     */
    removeCSS(id) {
        try {
            const style = document.getElementById(id);
            if (style) {
                style.remove();
            }
        } catch (error) {
            console.error('Error removing CSS:', error);
        }
    }
};

/**
 * 工具函数
 */
export const Utils = {
    /**
     * 防抖函数
     * @param {Function} func - 要防抖的函数
     * @param {number} wait - 等待时间（毫秒）
     * @returns {Function} 防抖后的函数
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * 节流函数
     * @param {Function} func - 要节流的函数
     * @param {number} limit - 时间限制（毫秒）
     * @returns {Function} 节流后的函数
     */
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => (inThrottle = false), limit);
            }
        };
    },

    /**
     * 深度克隆对象
     * @param {any} obj - 要克隆的对象
     * @returns {any} 克隆后的对象
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }

        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }

        if (typeof obj === 'object') {
            const cloned = {};
            Object.keys(obj).forEach(key => {
                cloned[key] = this.deepClone(obj[key]);
            });
            return cloned;
        }

        return obj;
    },

    /**
     * 合并对象
     * @param {Object} target - 目标对象
     * @param {...Object} sources - 源对象
     * @returns {Object} 合并后的对象
     */
    merge(target, ...sources) {
        if (!target || typeof target !== 'object') {
            target = {};
        }

        sources.forEach(source => {
            if (source && typeof source === 'object') {
                Object.keys(source).forEach(key => {
                    if (
                        source[key] &&
                        typeof source[key] === 'object' &&
                        !Array.isArray(source[key])
                    ) {
                        target[key] = this.merge(target[key] || {}, source[key]);
                    } else {
                        target[key] = source[key];
                    }
                });
            }
        });

        return target;
    },

    /**
     * 生成唯一ID
     * @param {string} prefix - 前缀
     * @returns {string} 唯一ID
     */
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * 检查是否为空值
     * @param {any} value - 要检查的值
     * @returns {boolean} 是否为空
     */
    isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    },

    /**
     * 类型检查
     * @param {any} value - 要检查的值
     * @returns {string} 值的类型
     */
    getType(value) {
        return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
    },

    /**
     * 安全的JSON解析
     * @param {string} jsonString - JSON字符串
     * @param {any} defaultValue - 默认值
     * @returns {any} 解析结果
     */
    safeJSONParse(jsonString, defaultValue = null) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn('JSON parse error:', error);
            return defaultValue;
        }
    },

    /**
     * 安全的JSON字符串化
     * @param {any} obj - 要字符串化的对象
     * @param {string} defaultValue - 默认值
     * @returns {string} JSON字符串
     */
    safeJSONStringify(obj, defaultValue = '{}') {
        try {
            return JSON.stringify(obj);
        } catch (error) {
            console.warn('JSON stringify error:', error);
            return defaultValue;
        }
    }
};

/**
 * 错误处理工具
 */
export const ErrorHandler = {
    /**
     * 安全执行函数
     * @param {Function} func - 要执行的函数
     * @param {any} defaultValue - 默认返回值
     * @param {string} context - 上下文信息
     * @returns {any} 执行结果
     */
    safeExecute(func, defaultValue = null, context = '') {
        try {
            return func();
        } catch (error) {
            console.error(`Error in ${context}:`, error);
            return defaultValue;
        }
    },

    /**
     * 创建错误对象
     * @param {string} type - 错误类型
     * @param {string} message - 错误消息
     * @param {any} details - 错误详情
     * @returns {Object} 错误对象
     */
    createError(type, message, details = null) {
        return {
            type,
            message,
            details,
            timestamp: new Date().toISOString(),
            stack: new Error().stack
        };
    },

    /**
     * 处理Promise错误
     * @param {Promise} promise - Promise对象
     * @param {string} context - 上下文信息
     * @returns {Promise} 处理后的Promise
     */
    handlePromise(promise, context = '') {
        return promise.catch(error => {
            console.error(`Promise error in ${context}:`, error);
            throw error;
        });
    }
};

/**
 * 调试工具
 */
export const Debug = {
    /**
     * 性能测量
     * @param {string} name - 测量名称
     * @param {Function} func - 要测量的函数
     * @returns {any} 函数执行结果
     */
    measure(name, func) {
        const start = performance.now();
        const result = func();
        const end = performance.now();
        console.log(`${name} took ${end - start} milliseconds`);
        return result;
    },

    /**
     * 内存使用情况
     * @returns {Object} 内存信息
     */
    getMemoryInfo() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1048576),
                total: Math.round(performance.memory.totalJSHeapSize / 1048576),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
            };
        }
        return null;
    },

    /**
     * 打印调试信息
     * @param {string} label - 标签
     * @param {any} data - 数据
     */
    log(label, data) {
        if (typeof data === 'object') {
            console.group(label);
            console.log(data);
            console.groupEnd();
        } else {
            console.log(`${label}:`, data);
        }
    }
};
