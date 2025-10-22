/**
 * 构建工具函数
 * 提供构建过程中需要的各种辅助功能
 */

const fs = require('fs');
const path = require('path');

class BuildUtils {
    /**
     * 读取文件内容
     * @param {string} filePath 文件路径
     * @returns {string} 文件内容
     */
    static readFile(filePath) {
        try {
            return fs.readFileSync(filePath, 'utf8');
        } catch (error) {
            throw new Error(`Failed to read file ${filePath}: ${error.message}`);
        }
    }

    /**
     * 写入文件内容
     * @param {string} filePath 文件路径
     * @param {string} content 文件内容
     */
    static writeFile(filePath, content) {
        try {
            // 确保目录存在
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(filePath, content, 'utf8');
        } catch (error) {
            throw new Error(`Failed to write file ${filePath}: ${error.message}`);
        }
    }

    /**
     * 检查文件是否存在
     * @param {string} filePath 文件路径
     * @returns {boolean} 文件是否存在
     */
    static fileExists(filePath) {
        return fs.existsSync(filePath);
    }

    /**
     * 获取文件的修改时间
     * @param {string} filePath 文件路径
     * @returns {Date} 修改时间
     */
    static getFileModTime(filePath) {
        try {
            const stats = fs.statSync(filePath);
            return stats.mtime;
        } catch (error) {
            return null;
        }
    }

    /**
     * 递归获取目录下的所有文件
     * @param {string} dir 目录路径
     * @param {string[]} extensions 文件扩展名过滤
     * @returns {string[]} 文件路径数组
     */
    static getAllFiles(dir, extensions = ['.js']) {
        const files = [];

        if (!fs.existsSync(dir)) {
            return files;
        }

        const items = fs.readdirSync(dir);

        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                files.push(...this.getAllFiles(fullPath, extensions));
            } else if (extensions.some(ext => item.endsWith(ext))) {
                files.push(fullPath);
            }
        }

        return files;
    }

    /**
     * 解析相对路径为绝对路径
     * @param {string} relativePath 相对路径
     * @param {string} basePath 基础路径
     * @returns {string} 绝对路径
     */
    static resolvePath(relativePath, basePath = process.cwd()) {
        if (path.isAbsolute(relativePath)) {
            return relativePath;
        }
        return path.resolve(basePath, relativePath);
    }

    /**
     * 标准化路径分隔符
     * @param {string} filePath 文件路径
     * @returns {string} 标准化后的路径
     */
    static normalizePath(filePath) {
        return filePath.replace(/\\/g, '/');
    }

    /**
     * 生成构建统计信息
     * @param {Object} stats 构建统计数据
     * @returns {string} 格式化的统计信息
     */
    static formatBuildStats(stats) {
        const {
            startTime,
            endTime,
            totalFiles,
            totalSize,
            outputFile,
            errors = [],
            warnings = []
        } = stats;

        const duration = endTime - startTime;
        const sizeKB = (totalSize / 1024).toFixed(2);

        let output = '\n=== 构建统计 ===\n';
        output += `构建时间: ${duration}ms\n`;
        output += `处理文件: ${totalFiles} 个\n`;
        output += `输出大小: ${sizeKB} KB\n`;
        output += `输出文件: ${outputFile}\n`;

        if (warnings.length > 0) {
            output += `\n警告 (${warnings.length}):\n`;
            warnings.forEach(warning => {
                output += `  - ${warning}\n`;
            });
        }

        if (errors.length > 0) {
            output += `\n错误 (${errors.length}):\n`;
            errors.forEach(error => {
                output += `  - ${error}\n`;
            });
        }

        output += '==================\n';

        return output;
    }

    /**
     * 日志输出
     * @param {string} message 消息
     * @param {string} level 日志级别
     */
    static log(message, level = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

        switch (level) {
            case 'error':
                console.error(`${prefix} ${message}`);
                break;
            case 'warn':
                console.warn(`${prefix} ${message}`);
                break;
            case 'success':
                console.log(`\x1b[32m${prefix} ${message}\x1b[0m`);
                break;
            default:
                console.log(`${prefix} ${message}`);
        }
    }
}

module.exports = BuildUtils;
