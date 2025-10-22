#!/usr/bin/env node

/**
 * 开发模式构建脚本
 * 提供快速的开发模式构建和监听功能
 */

const Builder = require('./build');
const BuildUtils = require('./utils');

class DevBuilder {
    constructor() {
        this.builder = null;
    }

    /**
     * 启动开发模式
     */
    async start() {
        const args = process.argv.slice(2);
        const options = this.parseDevArgs(args);

        BuildUtils.log('启动开发模式...', 'info');

        // 默认开发模式配置
        const devOptions = {
            development: true,
            watch: options.watch !== false,
            sourcemap: options.sourcemap || 'inline',
            ...options
        };

        this.builder = new Builder(devOptions);

        try {
            await this.builder.build();
        } catch (error) {
            BuildUtils.log(`开发模式启动失败: ${error.message}`, 'error');
            process.exit(1);
        }
    }

    /**
     * 解析开发模式参数
     * @param {string[]} args - 命令行参数
     * @returns {object} 解析后的选项
     */
    parseDevArgs(args) {
        const options = {};

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];

            switch (arg) {
                case '--no-watch':
                    options.watch = false;
                    break;
                case '--external-sourcemap':
                    options.sourcemap = true;
                    break;
                case '--no-sourcemap':
                    options.sourcemap = false;
                    break;
                case '--output':
                    if (i + 1 < args.length) {
                        options.output = args[++i];
                    }
                    break;
                case '--help':
                    this.showHelp();
                    process.exit(0);
                    break;
                default:
                    if (arg.startsWith('--')) {
                        BuildUtils.log(`未知参数: ${arg}`, 'warn');
                    }
            }
        }

        return options;
    }

    /**
     * 显示帮助信息
     */
    showHelp() {
        console.log(`
Scrollbar Controller 开发模式构建工具

用法:
  node build/dev.js [选项]

选项:
  --no-watch            禁用文件监听（只构建一次）
  --external-sourcemap  使用外部源码映射文件（默认内联）
  --no-sourcemap        禁用源码映射
  --output <文件>       指定输出文件路径
  --help               显示此帮助信息

默认行为:
  - 启用开发模式（保留调试信息）
  - 启用文件监听和自动重建
  - 生成内联源码映射
  - 输出到 dist/scrollbar-control.dev.user.js

示例:
  node build/dev.js                     # 标准开发模式
  node build/dev.js --no-watch          # 只构建一次
  node build/dev.js --external-sourcemap # 使用外部源码映射
        `);
    }
}

// 主程序入口
if (require.main === module) {
    const devBuilder = new DevBuilder();
    devBuilder.start().catch(error => {
        BuildUtils.log(`开发模式发生未处理的错误: ${error.message}`, 'error');
        process.exit(1);
    });
}

module.exports = DevBuilder;
