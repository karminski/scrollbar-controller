/**
 * 日志工具模块
 * 提供统一的日志记录系统，支持不同级别的日志输出和调试功能
 */

import { LogLevels } from './constants.js';

/**
 * 日志记录器类
 */
export class Logger {
    constructor(name = 'ScrollbarController', level = LogLevels.INFO) {
        this.name = name;
        this.level = level;
        this.enabled = true;
        this.logs = [];
        this.maxLogs = 1000; // 最大日志条数

        // 绑定方法以保持this上下文
        this.debug = this.debug.bind(this);
        this.info = this.info.bind(this);
        this.warn = this.warn.bind(this);
        this.error = this.error.bind(this);
    }

    /**
     * 设置日志级别
     * @param {number} level - 日志级别
     */
    setLevel(level) {
        if (Object.values(LogLevels).includes(level)) {
            this.level = level;
        }
    }

    /**
     * 启用或禁用日志
     * @param {boolean} enabled - 是否启用
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * 格式化日志消息
     * @param {string} level - 日志级别名称
     * @param {string} message - 消息
     * @param {any} data - 附加数据
     * @returns {Object} 格式化的日志对象
     */
    formatMessage(level, message, data = null) {
        return {
            timestamp: new Date().toISOString(),
            level,
            name: this.name,
            message,
            data,
            stack: level === 'ERROR' ? new Error().stack : null
        };
    }

    /**
     * 记录日志
     * @param {number} level - 日志级别
     * @param {string} levelName - 日志级别名称
     * @param {string} message - 消息
     * @param {any} data - 附加数据
     */
    log(level, levelName, message, data = null) {
        if (!this.enabled || level < this.level) {
            return;
        }

        const logEntry = this.formatMessage(levelName, message, data);

        // 添加到日志历史
        this.logs.push(logEntry);

        // 限制日志数量
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // 输出到控制台
        this.outputToConsole(levelName, logEntry);
    }

    /**
     * 输出到控制台
     * @param {string} levelName - 日志级别名称
     * @param {Object} logEntry - 日志条目
     */
    outputToConsole(levelName, logEntry) {
        const prefix = `[${logEntry.timestamp}] [${this.name}] [${levelName}]`;
        const message = `${prefix} ${logEntry.message}`;

        switch (levelName) {
            case 'DEBUG':
                if (logEntry.data) {
                    console.debug(message, logEntry.data);
                } else {
                    console.debug(message);
                }
                break;
            case 'INFO':
                if (logEntry.data) {
                    console.info(message, logEntry.data);
                } else {
                    console.info(message);
                }
                break;
            case 'WARN':
                if (logEntry.data) {
                    console.warn(message, logEntry.data);
                } else {
                    console.warn(message);
                }
                break;
            case 'ERROR':
                if (logEntry.data) {
                    console.error(message, logEntry.data);
                } else {
                    console.error(message);
                }
                if (logEntry.stack) {
                    console.error('Stack trace:', logEntry.stack);
                }
                break;
        }
    }

    /**
     * 调试级别日志
     * @param {string} message - 消息
     * @param {any} data - 附加数据
     */
    debug(message, data = null) {
        this.log(LogLevels.DEBUG, 'DEBUG', message, data);
    }

    /**
     * 信息级别日志
     * @param {string} message - 消息
     * @param {any} data - 附加数据
     */
    info(message, data = null) {
        this.log(LogLevels.INFO, 'INFO', message, data);
    }

    /**
     * 警告级别日志
     * @param {string} message - 消息
     * @param {any} data - 附加数据
     */
    warn(message, data = null) {
        this.log(LogLevels.WARN, 'WARN', message, data);
    }

    /**
     * 错误级别日志
     * @param {string} message - 消息
     * @param {any} data - 附加数据
     */
    error(message, data = null) {
        this.log(LogLevels.ERROR, 'ERROR', message, data);
    }

    /**
     * 分组开始
     * @param {string} label - 分组标签
     */
    group(label) {
        if (this.enabled) {
            console.group(`[${this.name}] ${label}`);
        }
    }

    /**
     * 分组结束
     */
    groupEnd() {
        if (this.enabled) {
            console.groupEnd();
        }
    }

    /**
     * 性能测量开始
     * @param {string} label - 测量标签
     */
    time(label) {
        if (this.enabled) {
            console.time(`[${this.name}] ${label}`);
        }
    }

    /**
     * 性能测量结束
     * @param {string} label - 测量标签
     */
    timeEnd(label) {
        if (this.enabled) {
            console.timeEnd(`[${this.name}] ${label}`);
        }
    }

    /**
     * 获取日志历史
     * @param {number} count - 获取的日志数量
     * @returns {Array} 日志数组
     */
    getLogs(count = 100) {
        return this.logs.slice(-count);
    }

    /**
     * 清空日志历史
     */
    clearLogs() {
        this.logs = [];
    }

    /**
     * 导出日志
     * @param {string} format - 导出格式 ('json' | 'text')
     * @returns {string} 导出的日志内容
     */
    exportLogs(format = 'json') {
        if (format === 'json') {
            return JSON.stringify(this.logs, null, 2);
        } else if (format === 'text') {
            return this.logs
                .map(log => {
                    const data = log.data ? ` | Data: ${JSON.stringify(log.data)}` : '';
                    return `${log.timestamp} [${log.level}] ${log.message}${data}`;
                })
                .join('\n');
        }
        return '';
    }

    /**
     * 创建子日志记录器
     * @param {string} name - 子记录器名称
     * @returns {Logger} 子日志记录器
     */
    createChild(name) {
        const childName = `${this.name}.${name}`;
        const child = new Logger(childName, this.level);
        child.setEnabled(this.enabled);
        return child;
    }
}

/**
 * 默认日志记录器实例
 */
export const logger = new Logger();

/**
 * 创建日志记录器
 * @param {string} name - 记录器名称
 * @param {number} level - 日志级别
 * @returns {Logger} 日志记录器实例
 */
export function createLogger(name, level = LogLevels.INFO) {
    return new Logger(name, level);
}

/**
 * 日志管理器
 */
export class LogManager {
    constructor() {
        this.loggers = new Map();
        this.globalLevel = LogLevels.INFO;
        this.globalEnabled = true;
    }

    /**
     * 获取或创建日志记录器
     * @param {string} name - 记录器名称
     * @returns {Logger} 日志记录器
     */
    getLogger(name) {
        if (!this.loggers.has(name)) {
            const loggerInstance = new Logger(name, this.globalLevel);
            loggerInstance.setEnabled(this.globalEnabled);
            this.loggers.set(name, loggerInstance);
        }
        return this.loggers.get(name);
    }

    /**
     * 设置全局日志级别
     * @param {number} level - 日志级别
     */
    setGlobalLevel(level) {
        this.globalLevel = level;
        this.loggers.forEach(loggerInstance => {
            loggerInstance.setLevel(level);
        });
    }

    /**
     * 设置全局启用状态
     * @param {boolean} enabled - 是否启用
     */
    setGlobalEnabled(enabled) {
        this.globalEnabled = enabled;
        this.loggers.forEach(loggerInstance => {
            loggerInstance.setEnabled(enabled);
        });
    }

    /**
     * 获取所有日志记录器
     * @returns {Map} 日志记录器映射
     */
    getAllLoggers() {
        return new Map(this.loggers);
    }

    /**
     * 清空所有日志记录器的历史
     */
    clearAllLogs() {
        this.loggers.forEach(loggerInstance => {
            loggerInstance.clearLogs();
        });
    }

    /**
     * 导出所有日志
     * @param {string} format - 导出格式
     * @returns {Object} 导出的日志数据
     */
    exportAllLogs(format = 'json') {
        const allLogs = {};
        this.loggers.forEach((loggerInstance, name) => {
            allLogs[name] = loggerInstance.exportLogs(format);
        });
        return allLogs;
    }
}

/**
 * 默认日志管理器实例
 */
export const logManager = new LogManager();

/**
 * 便捷函数：获取日志记录器
 * @param {string} name - 记录器名称
 * @returns {Logger} 日志记录器
 */
export function getLogger(name) {
    return logManager.getLogger(name);
}

/**
 * 便捷函数：设置全局日志级别
 * @param {number} level - 日志级别
 */
export function setLogLevel(level) {
    logManager.setGlobalLevel(level);
}

/**
 * 便捷函数：启用或禁用全局日志
 * @param {boolean} enabled - 是否启用
 */
export function setLogEnabled(enabled) {
    logManager.setGlobalEnabled(enabled);
}
