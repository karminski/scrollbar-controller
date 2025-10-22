/**
 * 模块合并器
 * 负责将ES6模块合并为单个文件，处理import/export语句和作用域
 */

const BuildUtils = require('./utils');
const SourceMapGenerator = require('./SourceMapGenerator');

class ModuleMerger {
    constructor(config) {
        this.config = config;
        this.moduleRegistry = new Map(); // 模块注册表
        this.exportRegistry = new Map(); // 导出注册表
        this.mergedCode = '';
        this.sourceMapGenerator = null;
        this.currentLine = 1;

        // 如果启用了源码映射，初始化生成器
        if (this.config.options && this.config.options.sourcemap) {
            this.sourceMapGenerator = new SourceMapGenerator(this.config);
        }
    }

    /**
     * 合并模块
     * @param {string[]} sortedModules 按依赖顺序排列的模块路径
     * @param {Map} moduleInfoMap 模块信息映射
     * @param {string} entryModulePath 入口模块路径
     * @returns {string} 合并后的代码
     */
    merge(sortedModules, moduleInfoMap, entryModulePath) {
        BuildUtils.log('开始合并模块...');

        // 清空之前的状态
        this.moduleRegistry.clear();
        this.exportRegistry.clear();
        this.mergedCode = '';
        // 设置入口模块路径
        this.entryModulePath = entryModulePath;

        // 生成模块包装器开始
        this.mergedCode += this.generateWrapperStart();

        // 处理每个模块
        for (const modulePath of sortedModules) {
            const moduleInfo = moduleInfoMap.get(modulePath);
            if (!moduleInfo) {
                throw new Error(`找不到模块信息: ${modulePath}`);
            }

            this.processModule(modulePath, moduleInfo);
        }

        // 生成模块包装器结束和启动代码
        this.mergedCode += this.generateWrapperEnd();

        BuildUtils.log(`模块合并完成，共处理 ${sortedModules.length} 个模块`);
        return this.mergedCode;
    }

    /**
     * 生成包装器开始代码
     * @returns {string} 包装器开始代码
     */
    generateWrapperStart() {
        return `(function() {
    'use strict';
    // 模块系统
    const __modules = {};
    const __moduleCache = {};
    const __exports = {};
    // 模块定义函数
    function __define(moduleId, factory) {
        __modules[moduleId] = factory;
    }
    
    // 模块加载函数
    function __require(moduleId) {
        if (__moduleCache[moduleId]) {
            return __moduleCache[moduleId];
        }
        if (!__modules[moduleId]) {
            throw new Error('Module not found: ' + moduleId);
        }

        const module = { exports: {} };
        const exports = module.exports;
        __modules[moduleId].call(exports, module, exports, __require);
        __moduleCache[moduleId] = module.exports;
        return module.exports;
    }

    // 模块定义开始
`;
    }

    /**
     * 生成包装器结束代码
     * @returns {string} 包装器结束代码
     */
    generateWrapperEnd() {
        // 生成入口模块的模块ID
        const entryModuleId = this.getModuleId(this.entryModulePath);
        return `
    // 启动应用程序
    try {
        __require('${entryModuleId}');
    } catch (error) {
        console.error('应用程序启动失败:', error);
    }
})();`;
    }

    /**
     * 处理单个模块
     * @param {string} modulePath 模块路径
     * @param {Object} moduleInfo 模块信息
     */
    processModule(modulePath, moduleInfo) {
        const moduleId = this.getModuleId(modulePath);
        const transformedCode = this.transformModuleCode(moduleInfo, moduleId, modulePath);

        // 添加到源码映射
        this.addModuleToSourceMap(modulePath, moduleInfo.content);

        // 生成模块定义
        const moduleDefCode = `    // 模块: ${modulePath}\n`;
        this.mergedCode += moduleDefCode;
        this.updateLineCount(moduleDefCode);

        const defineStartCode = `    __define('${moduleId}', function(module, exports, require) {\n`;
        this.mergedCode += defineStartCode;
        this.updateLineCount(defineStartCode);

        const indentedCode = this.indentCode(transformedCode, 2);
        this.mergedCode += indentedCode;
        this.updateLineCount(indentedCode);

        const defineEndCode = '    });\n\n';
        this.mergedCode += defineEndCode;
        this.updateLineCount(defineEndCode);

        // 注册模块
        this.moduleRegistry.set(moduleId, {
            path: modulePath,
            exports: moduleInfo.exports
        });
    }

    /**
     * 转换模块代码
     * @param {Object} moduleInfo 模块信息
     * @param {string} moduleId 模块ID
     * @param {string} modulePath 模块路径
     * @returns {string} 转换后的代码
     */
    transformModuleCode(moduleInfo, moduleId, modulePath) {
        let code = moduleInfo.content;

        // 移除import语句并替换为require调用
        code = this.transformImports(code, moduleInfo.imports, modulePath);

        // 转换export语句
        code = this.transformExports(code, moduleInfo.exports);

        // 移除多余的空行
        code = code.replace(/\n\s*\n\s*\n/g, '\n\n');

        return code;
    }

    /**
     * 转换import语句
     * @param {string} code 原始代码
     * @param {Array} imports import信息数组
     * @param {string} currentModulePath 当前模块路径
     * @returns {string} 转换后的代码
     */
    transformImports(code, imports, currentModulePath) {
        for (const importInfo of imports) {
            const moduleId = this.getModuleId(this.resolveImportPath(importInfo.source, currentModulePath));

            // 构建require语句
            let requireStatement = '';

            switch (importInfo.type) {
                case 'default': {
                    // import defaultExport from 'module'
                    const defaultSpecifier = importInfo.specifiers.find(s => s.imported === 'default');
                    if (defaultSpecifier) {
                        requireStatement = `const ${defaultSpecifier.local} = require('${moduleId}').default || require('${moduleId}');`;
                    }
                    break;
                }

                case 'named': {
                    // import { named } from 'module'
                    const namedSpecifiers = importInfo.specifiers.filter(s => s.imported !== 'default');
                    if (namedSpecifiers.length > 0) {
                        const destructuring = namedSpecifiers.map(s =>
                            s.imported === s.local ? s.imported : `${s.imported}: ${s.local}`
                        ).join(', ');
                        requireStatement = `const { ${destructuring} } = require('${moduleId}');`;
                    }
                    break;
                }

                case 'namespace': {
                    // import * as name from 'module'
                    const namespaceSpecifier = importInfo.specifiers.find(s => s.imported === '*');
                    if (namespaceSpecifier) {
                        requireStatement = `const ${namespaceSpecifier.local} = require('${moduleId}');`;
                    }
                    break;
                }

                case 'side-effect':
                    // import 'module'
                    requireStatement = `require('${moduleId}');`;
                    break;
            }

            // 替换import语句
            if (requireStatement) {
                const importRegex = this.createImportRegex(importInfo);
                code = code.replace(importRegex, requireStatement);
            }
        }

        return code;
    }

    /**
     * 转换export语句
     * @param {string} code 原始代码
     * @param {Array} exports export信息数组
     * @returns {string} 转换后的代码
     */
    transformExports(code, exports) {
        let transformedCode = code;
        const exportStatements = [];

        for (const exportInfo of exports) {
            switch (exportInfo.type) {
                case 'default':
                    // 处理 export default
                    transformedCode = transformedCode.replace(/export\s+default\s+/, 'module.exports.default = ');
                    exportStatements.push('module.exports = module.exports.default;');
                    break;

                case 'named':
                    // 处理 export { named }
                    transformedCode = transformedCode.replace(/export\s*\{\s*[^}]+\s*\}/g, '');
                    for (const spec of exportInfo.specifiers) {
                        exportStatements.push(`exports.${spec.exported} = ${spec.local};`);
                    }
                    break;

                case 'declaration': {
                    // 处理 export class/function/const/let/var/async function
                    if (exportInfo.keyword === 'async function') {
                        const pattern = new RegExp(`export\\s+async\\s+function\\s+${exportInfo.name}`, 'g');
                        transformedCode = transformedCode.replace(pattern, `async function ${exportInfo.name}`);
                    } else {
                        const pattern = new RegExp(`export\\s+${exportInfo.keyword}\\s+${exportInfo.name}`, 'g');
                        transformedCode = transformedCode.replace(pattern, `${exportInfo.keyword} ${exportInfo.name}`);
                    }
                    exportStatements.push(`exports.${exportInfo.name} = ${exportInfo.name};`);
                    break;
                }

                case 're-export-all':
                    // 处理 export * from 'module' (暂时跳过，需要更复杂的处理)
                    transformedCode = transformedCode.replace(/export\s*\*\s*from\s*['"`][^'"`]+['"`]/g, '');
                    break;
            }
        }

        // 在代码末尾添加所有导出语句
        if (exportStatements.length > 0) {
            transformedCode += '\n\n// 导出语句\n' + exportStatements.join('\n');
        }

        return transformedCode;
    }

    /**
     * 创建import语句的正则表达式
     * @param {Object} importInfo import信息
     * @returns {RegExp} 正则表达式
     */
    createImportRegex(importInfo) {
        const source = importInfo.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        switch (importInfo.type) {
            case 'default': {
                const defaultName = importInfo.specifiers.find(s => s.imported === 'default')?.local;
                return new RegExp(`import\\s+${defaultName}\\s+from\\s*['"\`]${source}['"\`]`, 'g');
            }

            case 'named':
                return new RegExp(`import\\s*\\{[^}]*\\}\\s*from\\s*['"\`]${source}['"\`]`, 'g');

            case 'namespace': {
                const namespaceName = importInfo.specifiers.find(s => s.imported === '*')?.local;
                return new RegExp(`import\\s*\\*\\s*as\\s+${namespaceName}\\s+from\\s*['"\`]${source}['"\`]`, 'g');
            }

            case 'side-effect':
                return new RegExp(`import\\s*['"\`]${source}['"\`]`, 'g');

            default:
                return new RegExp(`import.*from\\s*['"\`]${source}['"\`]`, 'g');
        }
    }

    /**
     * 获取模块ID
     * @param {string} modulePath 模块路径
     * @returns {string} 模块ID
     */
    getModuleId(modulePath) {
        // 将路径转换为模块ID
        const srcDir = BuildUtils.resolvePath(this.config.srcDir);
        // 标准化路径分隔符以确保一致性
        const normalizedModulePath = BuildUtils.normalizePath(modulePath);
        const normalizedSrcDir = BuildUtils.normalizePath(srcDir);
        let moduleId = normalizedModulePath;

        // 如果是src目录下的文件，使用相对路径作为ID
        if (normalizedModulePath.startsWith(normalizedSrcDir)) {
            moduleId = normalizedModulePath.substring(normalizedSrcDir.length + 1);
        }

        // 移除.js扩展名
        if (moduleId.endsWith('.js')) {
            moduleId = moduleId.substring(0, moduleId.length - 3);
        }

        return moduleId;
    }

    /**
     * 解析import路径
     * @param {string} importPath import路径
     * @param {string} currentModulePath 当前模块路径
     * @returns {string} 解析后的绝对路径
     */
    resolveImportPath(importPath, currentModulePath) {
        const path = require('path');
        // 使用与DependencyAnalyzer相同的路径解析逻辑
        let resolvedPath;

        // 处理相对路径
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
            const basePath = path.dirname(currentModulePath);
            resolvedPath = path.resolve(basePath, importPath);
        } else if (importPath.startsWith('/')) {
            // 绝对路径
            resolvedPath = importPath;
        } else {
            // 处理别名
            const alias = this.config.resolve?.alias || {};
            for (const [aliasKey, aliasPath] of Object.entries(alias)) {
                if (importPath.startsWith(aliasKey)) {
                    const relativePath = importPath.substring(aliasKey.length);
                    resolvedPath = path.join(aliasPath, relativePath);
                    break;
                }
            }

            if (!resolvedPath) {
                // 默认相对于src目录
                const srcDir = BuildUtils.resolvePath(this.config.srcDir);
                resolvedPath = path.resolve(srcDir, importPath);
            }
        }

        // 添加.js扩展名（如果没有扩展名）
        if (!path.extname(resolvedPath)) {
            resolvedPath += '.js';
        }

        return BuildUtils.normalizePath(resolvedPath);
    }

    /**
     * 缩进代码
     * @param {string} code 代码
     * @param {number} level 缩进级别
     * @returns {string} 缩进后的代码
     */
    indentCode(code, level) {
        const indent = '    '.repeat(level);
        return code.split('\n').map(line =>
            line.trim() ? indent + line : line
        ).join('\n') + '\n';
    }

    /**
     * 获取源码映射生成器
     * @returns {SourceMapGenerator|null} 源码映射生成器
     */
    getSourceMapGenerator() {
        return this.sourceMapGenerator;
    }

    /**
     * 添加模块到源码映射
     * @param {string} modulePath - 模块路径
     * @param {string} content - 模块内容
     */
    addModuleToSourceMap(modulePath, content) {
        if (this.sourceMapGenerator) {
            this.sourceMapGenerator.addModule(modulePath, content, this.currentLine);
        }
    }

    /**
     * 更新当前行号
     * @param {string} code - 添加的代码
     */
    updateLineCount(code) {
        const lines = code.split('\n').length - 1;
        this.currentLine += lines;
    }
}

module.exports = ModuleMerger;
