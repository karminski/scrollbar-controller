/**
 * 构建产物生成器
 * 负责生成最终的构建产物，包括语法验证和统计信息
 */

const fs = require('fs');
const path = require('path');
const BuildUtils = require('./utils');

class OutputGenerator {
    constructor(config) {
        this.config = config;
    }

    /**
     * 生成构建产物
     * @param {string} finalScript 最终脚本内容
     * @returns {Object} 生成结果
     */
    generate(finalScript) {
        BuildUtils.log('开始生成构建产物...');

        const result = {
            success: false,
            outputPath: '',
            size: 0,
            errors: [],
            warnings: []
        };

        try {
            // 1. 验证脚本语法
            const syntaxValidation = this.validateSyntax(finalScript);
            if (!syntaxValidation.valid) {
                result.errors.push(...syntaxValidation.errors);
                return result;
            }
            result.warnings.push(...syntaxValidation.warnings);

            // 2. 处理代码优化（如果启用）
            let processedScript = finalScript;
            if (this.config.options?.minify) {
                processedScript = this.minifyCode(processedScript);
                BuildUtils.log('代码压缩完成');
            }

            // 3. 生成源码映射（如果启用）
            if (this.config.options?.sourcemap) {
                this.generateSourceMap(processedScript);
                BuildUtils.log('源码映射生成完成');
            }

            // 4. 写入输出文件
            const outputPath = BuildUtils.resolvePath(this.config.output);
            this.writeOutputFile(outputPath, processedScript);

            // 5. 生成统计信息
            const stats = this.generateStats(outputPath, processedScript);

            result.success = true;
            result.outputPath = outputPath;
            result.size = stats.size;
            result.stats = stats;

            BuildUtils.log(`构建产物生成完成: ${outputPath}`, 'success');
            return result;

        } catch (error) {
            result.errors.push(error.message);
            BuildUtils.log(`构建产物生成失败: ${error.message}`, 'error');
            return result;
        }
    }

    /**
     * 验证脚本语法
     * @param {string} script 脚本内容
     * @returns {Object} 验证结果
     */
    validateSyntax(script) {
        BuildUtils.log('验证脚本语法...');

        const result = {
            valid: true,
            errors: [],
            warnings: []
        };

        try {
            // 使用Node.js的vm模块进行语法检查
            const vm = require('vm');

            // 创建一个新的上下文来检查语法
            vm.createContext({
                console: console,
                window: {},
                document: {},
                // 添加常见的浏览器全局变量
                navigator: {},
                location: {},
                setTimeout: () => {},
                setInterval: () => {},
                clearTimeout: () => {},
                clearInterval: () => {}
            });

            // 尝试编译脚本
            new vm.Script(script);

            // 检查常见的问题
            this.checkCommonIssues(script, result);

            BuildUtils.log('语法验证通过');

        } catch (error) {
            result.valid = false;
            result.errors.push(`语法错误: ${error.message}`);

            // 尝试提供更详细的错误信息
            if (error.stack) {
                const lines = error.stack.split('\n');
                const errorLine = lines.find(line => line.includes('at '));
                if (errorLine) {
                    result.errors.push(`错误位置: ${errorLine.trim()}`);
                }
            }
        }

        return result;
    }

    /**
     * 检查常见问题
     * @param {string} script 脚本内容
     * @param {Object} result 结果对象
     */
    checkCommonIssues(script, result) {
        // 检查未闭合的括号
        const openBraces = (script.match(/\{/g) || []).length;
        const closeBraces = (script.match(/\}/g) || []).length;
        if (openBraces !== closeBraces) {
            result.warnings.push(`大括号不匹配: 开括号 ${openBraces} 个，闭括号 ${closeBraces} 个`);
        }

        const openParens = (script.match(/\(/g) || []).length;
        const closeParens = (script.match(/\)/g) || []).length;
        if (openParens !== closeParens) {
            result.warnings.push(`圆括号不匹配: 开括号 ${openParens} 个，闭括号 ${closeParens} 个`);
        }

        // 检查可能的问题模式
        if (script.includes('import ') && !script.includes('require(')) {
            result.warnings.push('检测到import语句，可能未正确转换');
        }

        if (script.includes('export ') && !script.includes('module.exports')) {
            result.warnings.push('检测到export语句，可能未正确转换');
        }

        // 检查console.log的使用
        const consoleLogCount = (script.match(/console\.log/g) || []).length;
        if (consoleLogCount > 10) {
            result.warnings.push(`检测到大量console.log语句 (${consoleLogCount} 个)，建议在生产版本中移除`);
        }

        // 检查可能的内存泄漏
        if (script.includes('setInterval') && !script.includes('clearInterval')) {
            result.warnings.push('检测到setInterval但未找到对应的clearInterval，可能导致内存泄漏');
        }
    }

    /**
     * 压缩代码
     * @param {string} script 脚本内容
     * @returns {string} 压缩后的脚本
     */
    minifyCode(script) {
        BuildUtils.log('开始压缩代码...');

        // 简单的代码压缩实现
        let minified = script;

        // 移除多余的空白字符
        minified = minified.replace(/\s+/g, ' ');

        // 移除注释（保留油猴脚本头部）
        const lines = minified.split('\n');
        const processedLines = [];
        let inUserscriptHeader = false;

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine === '// ==UserScript==') {
                inUserscriptHeader = true;
                processedLines.push(line);
                continue;
            }

            if (trimmedLine === '// ==/UserScript==') {
                inUserscriptHeader = false;
                processedLines.push(line);
                continue;
            }

            if (inUserscriptHeader) {
                processedLines.push(line);
                continue;
            }

            // 移除单行注释（但保留URL中的//）
            if (trimmedLine.startsWith('//') && !trimmedLine.includes('http')) {
                continue;
            }

            processedLines.push(line);
        }

        minified = processedLines.join('\n');

        // 移除多行注释
        minified = minified.replace(/\/\*[\s\S]*?\*\//g, '');

        // 移除console.log语句（如果配置为不保留）
        if (!this.config.options?.preserveConsole) {
            // 移除console.log、console.warn、console.error等语句
            minified = minified.replace(/console\.(log|warn|error|info|debug)\([^)]*\);?/g, '');
            // 移除可能的多行console语句
            minified = minified.replace(/console\.(log|warn|error|info|debug)\([^)]*\n[^)]*\);?/g, '');
        }

        // 移除多余的换行
        minified = minified.replace(/\n\s*\n/g, '\n');

        BuildUtils.log('代码压缩完成');
        return minified;
    }

    /**
     * 生成源码映射
     * @param {string} script 脚本内容
     */
    generateSourceMap(script) {
        // 简单的源码映射实现
        // 在实际项目中，可能需要使用专门的源码映射库
        const sourceMap = {
            version: 3,
            file: path.basename(this.config.output),
            sources: ['merged-modules.js'],
            names: [],
            mappings: '',
            sourcesContent: [script]
        };

        const sourceMapPath = this.config.output + '.map';
        BuildUtils.writeFile(sourceMapPath, JSON.stringify(sourceMap, null, 2));

        BuildUtils.log(`源码映射已生成: ${sourceMapPath}`);
    }

    /**
     * 写入输出文件
     * @param {string} outputPath 输出路径
     * @param {string} content 文件内容
     */
    writeOutputFile(outputPath, content) {
        BuildUtils.log(`写入输出文件: ${outputPath}`);

        // 确保输出目录存在
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            BuildUtils.log(`创建输出目录: ${outputDir}`);
        }

        // 写入文件
        BuildUtils.writeFile(outputPath, content);

        // 设置文件权限（Unix系统）
        if (process.platform !== 'win32') {
            try {
                fs.chmodSync(outputPath, 0o644);
            } catch (error) {
                BuildUtils.log(`设置文件权限失败: ${error.message}`, 'warn');
            }
        }
    }

    /**
     * 生成统计信息
     * @param {string} outputPath 输出路径
     * @param {string} content 文件内容
     * @returns {Object} 统计信息
     */
    generateStats(outputPath, content) {
        const stats = {
            size: Buffer.byteLength(content, 'utf8'),
            lines: content.split('\n').length,
            characters: content.length,
            outputPath: outputPath,
            timestamp: new Date().toISOString()
        };

        // 分析代码结构
        stats.functions = (content.match(/function\s+\w+/g) || []).length;
        stats.classes = (content.match(/class\s+\w+/g) || []).length;
        stats.comments = (content.match(/\/\/.*$/gm) || []).length +
                        (content.match(/\/\*[\s\S]*?\*\//g) || []).length;

        // 生成统计报告文件
        if (this.config.options?.generateReport) {
            this.generateStatsReport(stats);
        }

        return stats;
    }

    /**
     * 生成统计报告文件
     * @param {Object} stats 统计信息
     */
    generateStatsReport(stats) {
        const reportPath = this.config.output.replace(/\.user\.js$/, '.stats.json');

        const report = {
            buildTime: new Date().toISOString(),
            config: {
                entry: this.config.entry,
                output: this.config.output,
                options: this.config.options
            },
            stats: stats,
            performance: {
                sizeKB: (stats.size / 1024).toFixed(2),
                gzipEstimate: this.estimateGzipSize(stats.size)
            }
        };

        BuildUtils.writeFile(reportPath, JSON.stringify(report, null, 2));
        BuildUtils.log(`统计报告已生成: ${reportPath}`);
    }

    /**
     * 估算Gzip压缩后的大小
     * @param {number} originalSize 原始大小
     * @returns {string} 估算的压缩大小
     */
    estimateGzipSize(originalSize) {
        // 简单的Gzip压缩比估算（通常为30-70%）
        const compressionRatio = 0.4; // 假设40%的压缩比
        const estimatedSize = originalSize * compressionRatio;
        return (estimatedSize / 1024).toFixed(2) + ' KB (估算)';
    }

    /**
     * 验证输出文件
     * @param {string} outputPath 输出文件路径
     * @returns {boolean} 验证是否通过
     */
    validateOutput(outputPath) {
        try {
            if (!BuildUtils.fileExists(outputPath)) {
                return false;
            }

            const content = BuildUtils.readFile(outputPath);

            // 检查文件是否为空
            if (!content.trim()) {
                return false;
            }

            // 检查是否包含油猴脚本头部
            if (!content.includes('// ==UserScript==')) {
                return false;
            }

            // 检查是否包含主要代码
            if (!content.includes('function') && !content.includes('class')) {
                return false;
            }

            return true;

        } catch (error) {
            BuildUtils.log(`输出文件验证失败: ${error.message}`, 'error');
            return false;
        }
    }
}

module.exports = OutputGenerator;
