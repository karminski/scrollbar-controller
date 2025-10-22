#!/usr/bin/env node

/**
 * 主构建脚本
 * 协调整个构建过程，包括依赖分析、模块合并、代码转换和产物生成
 */

const path = require('path');
const BuildUtils = require('./utils');
const DependencyAnalyzer = require('./DependencyAnalyzer');
const ModuleMerger = require('./ModuleMerger');
const UserscriptTemplate = require('./template');
const OutputGenerator = require('./OutputGenerator');
const FileWatcher = require('./FileWatcher');
const config = require('./config');

class Builder {
    constructor(options = {}) {
        this.config = { ...config, ...options };

        // 开发模式配置调整
        if (options.development) {
            this.config = {
                ...this.config,
                ...config.development,
                options: {
                    ...this.config.options,
                    ...config.development.options
                },
                userscriptMeta: {
                    ...this.config.userscriptMeta,
                    ...config.development.userscriptMeta
                }
            };
        }

        // 监听模式配置
        if (options.watch) {
            this.config.watch = {
                ...config.watch,
                enabled: true
            };
        }

        this.stats = {
            startTime: 0,
            endTime: 0,
            totalFiles: 0,
            totalSize: 0,
            outputFile: '',
            errors: [],
            warnings: [],
            sourceMapGenerated: false
        };

        this.fileWatcher = null;
    }

    /**
     * 执行构建过程
     */
    async build() {
        // 如果启用了监听模式，设置文件监听
        if (this.config.watch && this.config.watch.enabled) {
            return this.startWatchMode();
        }

        return this.performBuild();
    }

    /**
     * 执行单次构建
     */
    async performBuild() {
        try {
            this.stats.startTime = Date.now();
            BuildUtils.log('开始构建过程...');

            // 1. 验证配置和环境
            this.validateConfig();

            // 2. 分析模块依赖
            const dependencyAnalyzer = new DependencyAnalyzer(this.config);
            const entryPath = BuildUtils.resolvePath(this.config.entry);
            const sortedModules = dependencyAnalyzer.analyze(entryPath);

            // 3. 合并模块代码
            const moduleMerger = new ModuleMerger(this.config);
            const moduleInfoMap = dependencyAnalyzer.getAllModules();
            const mergedCode = moduleMerger.merge(sortedModules, moduleInfoMap, entryPath);

            // 4. 生成油猴脚本模板
            const template = new UserscriptTemplate(this.config);

            // 验证元数据
            const validation = template.validateMetadata();
            if (validation.errors.length > 0) {
                throw new Error(`元数据验证失败: ${validation.errors.join(', ')}`);
            }

            if (validation.warnings.length > 0) {
                validation.warnings.forEach(warning => {
                    BuildUtils.log(warning, 'warn');
                });
            }

            // 生成完整的油猴脚本
            let finalScript = template.generate(mergedCode);

            // 处理源码映射
            if (this.config.options && this.config.options.sourcemap) {
                const sourceMapGenerator = moduleMerger.getSourceMapGenerator();
                if (sourceMapGenerator) {
                    const outputFileName = path.basename(this.config.output);

                    if (this.config.options.sourcemap === 'inline') {
                        // 内联源码映射
                        finalScript += sourceMapGenerator.generateInlineComment(outputFileName);
                    } else {
                        // 外部源码映射文件
                        const mapFileName = outputFileName + '.map';
                        const mapFilePath = path.join(path.dirname(this.config.output), mapFileName);

                        // 生成映射文件
                        const mapContent = sourceMapGenerator.generateExternalFile(outputFileName);
                        require('fs').writeFileSync(mapFilePath, mapContent);

                        // 添加映射引用
                        finalScript += sourceMapGenerator.generateExternalComment(mapFileName);

                        BuildUtils.log(`源码映射文件已生成: ${mapFileName}`);
                    }

                    this.stats.sourceMapGenerated = true;
                }
            }

            // 5. 生成构建产物
            const outputGenerator = new OutputGenerator(this.config);
            const outputResult = outputGenerator.generate(finalScript);

            if (!outputResult.success) {
                this.stats.errors.push(...outputResult.errors);
                throw new Error(`构建产物生成失败: ${outputResult.errors.join(', ')}`);
            }

            // 更新统计信息
            this.stats.totalSize = outputResult.size;
            this.stats.warnings.push(...outputResult.warnings);

            this.stats.endTime = Date.now();
            this.stats.totalFiles = sortedModules.length;
            this.stats.outputFile = this.config.output;

            // 输出构建统计
            const statsOutput = BuildUtils.formatBuildStats(this.stats);
            BuildUtils.log(statsOutput);

            BuildUtils.log('构建过程完成！', 'success');
            return true;

        } catch (error) {
            this.stats.errors.push(error.message);
            BuildUtils.log(`构建失败: ${error.message}`, 'error');

            if (!this.config.watch) {
                process.exit(1);
            }
            return false;
        }
    }

    /**
     * 启动监听模式
     */
    async startWatchMode() {
        BuildUtils.log('启动监听模式...', 'info');

        // 执行初始构建
        await this.performBuild();

        // 创建文件监听器
        this.fileWatcher = new FileWatcher(this.config, () => this.performBuild());

        // 启动监听
        const watchStarted = this.fileWatcher.start();
        
        if (!watchStarted) {
            BuildUtils.log('文件监听不可用，执行单次构建后退出', 'warn');
            return;
        }

        // 处理进程退出
        process.on('SIGINT', async() => {
            BuildUtils.log('\n正在停止监听模式...', 'info');
            if (this.fileWatcher) {
                await this.fileWatcher.stop();
            }
            process.exit(0);
        });

        // 保持进程运行
        return new Promise(() => {});
    }

    /**
     * 验证构建配置
     */
    validateConfig() {
        BuildUtils.log('验证构建配置...');

        // 检查入口文件
        const entryPath = BuildUtils.resolvePath(this.config.entry);
        if (!BuildUtils.fileExists(entryPath)) {
            throw new Error(`入口文件不存在: ${entryPath}`);
        }

        // 检查源代码目录
        const srcDir = BuildUtils.resolvePath(this.config.srcDir);
        if (!BuildUtils.fileExists(srcDir)) {
            throw new Error(`源代码目录不存在: ${srcDir}`);
        }

        // 验证油猴脚本元数据
        const meta = this.config.userscriptMeta;
        if (!meta.name || !meta.version || !meta.description) {
            throw new Error('油猴脚本元数据不完整，需要name、version和description字段');
        }

        BuildUtils.log('配置验证通过');
    }

    /**
     * 处理命令行参数
     */
    static parseArgs() {
        const args = process.argv.slice(2);
        const options = {};

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];

            switch (arg) {
                case '--dev':
                    options.development = true;
                    break;
                case '--watch':
                    options.watch = true;
                    break;
                case '--minify':
                    options.minify = true;
                    break;
                case '--sourcemap':
                    options.sourcemap = true;
                    break;
                case '--sourcemap-inline':
                    options.sourcemap = 'inline';
                    break;
                case '--output':
                    if (i + 1 < args.length) {
                        options.output = args[++i];
                    }
                    break;
                case '--help':
                    Builder.showHelp();
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
    static showHelp() {
        console.log(`
Scrollbar Controller 构建工具

用法:
  node build/build.js [选项]

选项:
  --dev         开发模式构建（保留调试信息，启用源码映射）
  --watch       监听文件变化并自动重建
  --minify      压缩输出代码
  --sourcemap   生成外部源码映射文件
  --sourcemap-inline  生成内联源码映射
  --output <文件> 指定输出文件路径
  --help        显示此帮助信息

示例:
  node build/build.js                    # 标准构建
  node build/build.js --dev              # 开发模式构建
  node build/build.js --dev --watch      # 开发模式 + 监听
  node build/build.js --sourcemap        # 生成源码映射
  node build/build.js --minify           # 压缩构建
  node build/build.js --output dist/my-script.user.js  # 自定义输出路径
        `);
    }
}

// 主程序入口
if (require.main === module) {
    const options = Builder.parseArgs();
    const builder = new Builder(options);

    builder.build().catch(error => {
        BuildUtils.log(`构建过程发生未处理的错误: ${error.message}`, 'error');
        process.exit(1);
    });
}

module.exports = Builder;
