/**
 * 油猴脚本模板和元数据处理
 * 负责生成油猴脚本的头部信息和模板结构
 */

const BuildUtils = require('./utils');

class UserscriptTemplate {
    constructor(config) {
        this.config = config;
        this.meta = config.userscriptMeta || {};
    }

    /**
     * 生成完整的油猴脚本
     * @param {string} code 合并后的代码
     * @returns {string} 完整的油猴脚本
     */
    generate(code) {
        BuildUtils.log('生成油猴脚本模板...');

        const header = this.generateHeader();
        const footer = this.generateFooter();

        const fullScript = header + '\n' + code + '\n' + footer;

        BuildUtils.log('油猴脚本模板生成完成');
        return fullScript;
    }

    /**
     * 生成油猴脚本头部
     * @returns {string} 脚本头部
     */
    generateHeader() {
        const lines = ['// ==UserScript=='];

        // 必需字段
        if (this.meta.name) {
            lines.push(`// @name         ${this.meta.name}`);
        }

        if (this.meta.namespace) {
            lines.push(`// @namespace    ${this.meta.namespace}`);
        }

        if (this.meta.version) {
            lines.push(`// @version      ${this.meta.version}`);
        }

        if (this.meta.description) {
            lines.push(`// @description  ${this.meta.description}`);
        }

        if (this.meta.author) {
            lines.push(`// @author       ${this.meta.author}`);
        }

        // 匹配规则
        if (this.meta.match) {
            if (Array.isArray(this.meta.match)) {
                this.meta.match.forEach(pattern => {
                    lines.push(`// @match        ${pattern}`);
                });
            } else {
                lines.push(`// @match        ${this.meta.match}`);
            }
        }

        // 包含规则
        if (this.meta.include) {
            if (Array.isArray(this.meta.include)) {
                this.meta.include.forEach(pattern => {
                    lines.push(`// @include      ${pattern}`);
                });
            } else {
                lines.push(`// @include      ${this.meta.include}`);
            }
        }

        // 排除规则
        if (this.meta.exclude) {
            if (Array.isArray(this.meta.exclude)) {
                this.meta.exclude.forEach(pattern => {
                    lines.push(`// @exclude      ${pattern}`);
                });
            } else {
                lines.push(`// @exclude      ${this.meta.exclude}`);
            }
        }

        // 权限设置
        if (this.meta.grant) {
            if (Array.isArray(this.meta.grant)) {
                this.meta.grant.forEach(permission => {
                    lines.push(`// @grant        ${permission}`);
                });
            } else {
                lines.push(`// @grant        ${this.meta.grant}`);
            }
        }

        // 运行时机
        if (this.meta.runAt) {
            lines.push(`// @run-at       ${this.meta.runAt}`);
        }

        // 其他常用字段
        if (this.meta.homepage) {
            lines.push(`// @homepage     ${this.meta.homepage}`);
        }

        if (this.meta.homepageURL) {
            lines.push(`// @homepageURL  ${this.meta.homepageURL}`);
        }

        if (this.meta.website) {
            lines.push(`// @website      ${this.meta.website}`);
        }

        if (this.meta.source) {
            lines.push(`// @source       ${this.meta.source}`);
        }

        if (this.meta.icon) {
            lines.push(`// @icon         ${this.meta.icon}`);
        }

        if (this.meta.iconURL) {
            lines.push(`// @iconURL      ${this.meta.iconURL}`);
        }

        if (this.meta.icon64) {
            lines.push(`// @icon64       ${this.meta.icon64}`);
        }

        if (this.meta.icon64URL) {
            lines.push(`// @icon64URL    ${this.meta.icon64URL}`);
        }

        // 更新相关
        if (this.meta.updateURL) {
            lines.push(`// @updateURL    ${this.meta.updateURL}`);
        }

        if (this.meta.downloadURL) {
            lines.push(`// @downloadURL  ${this.meta.downloadURL}`);
        }

        if (this.meta.supportURL) {
            lines.push(`// @supportURL   ${this.meta.supportURL}`);
        }

        // 依赖和资源
        if (this.meta.require) {
            if (Array.isArray(this.meta.require)) {
                this.meta.require.forEach(url => {
                    lines.push(`// @require      ${url}`);
                });
            } else {
                lines.push(`// @require      ${this.meta.require}`);
            }
        }

        if (this.meta.resource) {
            if (Array.isArray(this.meta.resource)) {
                this.meta.resource.forEach(resource => {
                    lines.push(`// @resource     ${resource}`);
                });
            } else {
                lines.push(`// @resource     ${this.meta.resource}`);
            }
        }

        // 高级设置
        if (this.meta.noframes !== undefined) {
            lines.push(`// @noframes     ${this.meta.noframes}`);
        }

        if (this.meta.unwrap !== undefined) {
            lines.push(`// @unwrap       ${this.meta.unwrap}`);
        }

        if (this.meta.nocompat) {
            lines.push(`// @nocompat     ${this.meta.nocompat}`);
        }

        // 自定义字段
        if (this.meta.custom) {
            Object.entries(this.meta.custom).forEach(([key, value]) => {
                lines.push(`// @${key}       ${value}`);
            });
        }

        // 添加构建信息注释
        const buildDate = new Date().toISOString();
        lines.push(`// @buildDate    ${buildDate}`);

        lines.push('// ==/UserScript==');
        lines.push('');

        return lines.join('\n');
    }

    /**
     * 生成脚本尾部
     * @returns {string} 脚本尾部
     */
    generateFooter() {
        return `
// 脚本构建信息
// 构建时间: ${new Date().toLocaleString()}
// 构建工具: Scrollbar Controller Build System
`;
    }

    /**
     * 验证元数据
     * @returns {Array} 验证错误数组
     */
    validateMetadata() {
        const errors = [];
        const warnings = [];

        // 检查必需字段
        const requiredFields = ['name', 'version', 'description'];
        for (const field of requiredFields) {
            if (!this.meta[field]) {
                errors.push(`缺少必需字段: ${field}`);
            }
        }

        // 检查版本格式
        if (this.meta.version && !this.isValidVersion(this.meta.version)) {
            warnings.push(`版本号格式可能不正确: ${this.meta.version}`);
        }

        // 检查匹配规则
        if (!this.meta.match && !this.meta.include) {
            warnings.push('没有设置匹配规则 (@match 或 @include)');
        }

        // 检查权限设置
        if (!this.meta.grant) {
            warnings.push('没有设置权限 (@grant)，建议设置为 "none" 或具体权限');
        }

        // 检查运行时机
        if (!this.meta.runAt) {
            warnings.push('没有设置运行时机 (@run-at)，建议设置为合适的值');
        }

        return { errors, warnings };
    }

    /**
     * 检查版本号格式是否有效
     * @param {string} version 版本号
     * @returns {boolean} 是否有效
     */
    isValidVersion(version) {
        // 支持语义化版本号格式
        const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

        // 支持简单版本号格式
        const simpleRegex = /^\d+(\.\d+)*$/;

        return semverRegex.test(version) || simpleRegex.test(version);
    }

    /**
     * 生成默认元数据
     * @returns {Object} 默认元数据
     */
    static getDefaultMetadata() {
        return {
            name: 'Scrollbar Controller',
            namespace: 'http://tampermonkey.net/',
            version: '2.0.0',
            description: '提供对网页滚动条显示的精细控制，支持三种显示模式和自动滚动',
            author: 'karminski-牙医',
            match: '*://*/*',
            grant: 'none',
            runAt: 'document-end',
            noframes: true,
            homepage: 'https://github.com/karminski/scrollbar-control',
            supportURL: 'https://github.com/karminski/scrollbar-control/issues',
            icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNCIgZmlsbD0iIzMzNzNkYyIvPgo8cGF0aCBkPSJNOCAxMmg0djhoLTR2LTh6bTYgMGg0djhoLTR2LTh6bTYgMGg0djhoLTR2LTh6IiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K'
        };
    }

    /**
     * 从现有脚本中提取元数据
     * @param {string} scriptContent 脚本内容
     * @returns {Object} 提取的元数据
     */
    static extractMetadata(scriptContent) {
        const metadata = {};
        const lines = scriptContent.split('\n');
        let inHeader = false;

        for (const line of lines) {
            if (line.trim() === '// ==UserScript==') {
                inHeader = true;
                continue;
            }

            if (line.trim() === '// ==/UserScript==') {
                break;
            }

            if (inHeader && line.startsWith('// @')) {
                const match = line.match(/^\/\/\s*@(\w+)\s+(.+)$/);
                if (match) {
                    const [, key, value] = match;

                    // 处理数组类型的字段
                    if (['match', 'include', 'exclude', 'grant', 'require', 'resource'].includes(key)) {
                        if (!metadata[key]) {
                            metadata[key] = [];
                        }
                        metadata[key].push(value);
                    } else {
                        metadata[key] = value;
                    }
                }
            }
        }

        return metadata;
    }
}

module.exports = UserscriptTemplate;
