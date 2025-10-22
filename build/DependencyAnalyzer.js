/**
 * 模块依赖分析器
 * 分析ES6模块的import/export语句，构建依赖关系图
 */

const path = require('path');
const BuildUtils = require('./utils');

class DependencyAnalyzer {
    constructor(config) {
        this.config = config;
        this.modules = new Map(); // 存储所有模块信息
        this.dependencyGraph = new Map(); // 存储依赖关系图
        this.resolveCache = new Map(); // 路径解析缓存
    }

    /**
     * 分析模块依赖关系
     * @param {string} entryFile 入口文件路径
     * @returns {string[]} 按依赖顺序排列的模块路径数组
     */
    analyze(entryFile) {
        BuildUtils.log('开始分析模块依赖关系...');

        // 清空之前的分析结果
        this.modules.clear();
        this.dependencyGraph.clear();
        this.resolveCache.clear();

        // 从入口文件开始递归分析
        this.analyzeModule(entryFile);

        // 进行拓扑排序，确定模块加载顺序
        const sortedModules = this.topologicalSort();

        BuildUtils.log(`依赖分析完成，共发现 ${this.modules.size} 个模块`);

        return sortedModules;
    }

    /**
     * 分析单个模块
     * @param {string} filePath 模块文件路径
     * @param {Set} visited 已访问的模块集合，用于检测循环依赖
     */
    analyzeModule(filePath, visited = new Set()) {
        const resolvedPath = this.resolvePath(filePath);

        // 检测循环依赖
        if (visited.has(resolvedPath)) {
            throw new Error(`检测到循环依赖: ${Array.from(visited).join(' -> ')} -> ${resolvedPath}`);
        }

        // 如果已经分析过，跳过
        if (this.modules.has(resolvedPath)) {
            return;
        }

        // 读取模块内容
        if (!BuildUtils.fileExists(resolvedPath)) {
            throw new Error(`模块文件不存在: ${resolvedPath}`);
        }

        const content = BuildUtils.readFile(resolvedPath);

        // 解析import语句
        const imports = this.parseImports(content);
        const exports = this.parseExports(content);

        // 存储模块信息
        const moduleInfo = {
            path: resolvedPath,
            content: content,
            imports: imports,
            exports: exports,
            dependencies: []
        };

        this.modules.set(resolvedPath, moduleInfo);
        this.dependencyGraph.set(resolvedPath, new Set());

        // 递归分析依赖模块
        visited.add(resolvedPath);

        for (const importInfo of imports) {
            const depPath = this.resolvePath(importInfo.source, path.dirname(resolvedPath));
            moduleInfo.dependencies.push(depPath);
            this.dependencyGraph.get(resolvedPath).add(depPath);

            // 递归分析依赖模块
            this.analyzeModule(depPath, new Set(visited));
        }

        visited.delete(resolvedPath);
    }

    /**
     * 解析import语句
     * @param {string} content 模块内容
     * @returns {Array} import信息数组
     */
    parseImports(content) {
        const imports = [];

        // 匹配各种import语句格式
        const importPatterns = [
            // import { named } from 'module'
            /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"`]([^'"`]+)['"`]/g,
            // import defaultExport from 'module'
            /import\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s+from\s*['"`]([^'"`]+)['"`]/g,
            // import * as name from 'module'
            /import\s*\*\s*as\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s+from\s*['"`]([^'"`]+)['"`]/g,
            // import 'module' (side effect import)
            /import\s*['"`]([^'"`]+)['"`]/g
        ];

        for (const pattern of importPatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const importInfo = {
                    type: this.getImportType(match[0]),
                    source: match[match.length - 1], // 最后一个捕获组是模块路径
                    specifiers: this.parseImportSpecifiers(match[0])
                };
                imports.push(importInfo);
            }
        }

        return imports;
    }

    /**
     * 解析export语句
     * @param {string} content 模块内容
     * @returns {Array} export信息数组
     */
    parseExports(content) {
        const exports = [];

        // 匹配 export class/function/const/let/var
        const declarationPattern = /export\s+(class|function|const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        let match;
        while ((match = declarationPattern.exec(content)) !== null) {
            exports.push({
                type: 'declaration',
                keyword: match[1],
                name: match[2],
                specifiers: [{ local: match[2], exported: match[2] }]
            });
        }

        // 匹配 export { named }
        const namedPattern = /export\s*\{\s*([^}]+)\s*\}/g;
        while ((match = namedPattern.exec(content)) !== null) {
            const specifiers = this.parseExportSpecifiers(match[0]);
            exports.push({
                type: 'named',
                specifiers: specifiers
            });
        }

        // 匹配 export default
        const defaultPattern = /export\s+default\s+/g;
        while ((match = defaultPattern.exec(content)) !== null) {
            exports.push({
                type: 'default',
                specifiers: [{ local: 'default', exported: 'default' }]
            });
        }

        // 匹配 export async function
        const asyncFunctionPattern = /export\s+async\s+function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        while ((match = asyncFunctionPattern.exec(content)) !== null) {
            exports.push({
                type: 'declaration',
                keyword: 'async function',
                name: match[1],
                specifiers: [{ local: match[1], exported: match[1] }]
            });
        }

        // 匹配 export * from 'module'
        const reExportPattern = /export\s*\*\s*from\s*['"`]([^'"`]+)['"`]/g;
        while ((match = reExportPattern.exec(content)) !== null) {
            exports.push({
                type: 're-export-all',
                source: match[1],
                specifiers: []
            });
        }

        return exports;
    }

    /**
     * 获取import类型
     * @param {string} importStatement import语句
     * @returns {string} import类型
     */
    getImportType(importStatement) {
        if (importStatement.includes('* as ')) return 'namespace';
        if (importStatement.includes('{')) return 'named';
        if (importStatement.match(/import\s+[a-zA-Z_$]/)) return 'default';
        return 'side-effect';
    }

    /**
     * 获取export类型
     * @param {string} exportStatement export语句
     * @returns {string} export类型
     */
    getExportType(exportStatement) {
        if (exportStatement.includes('default')) return 'default';
        if (exportStatement.includes('* from')) return 're-export-all';
        if (exportStatement.includes('{')) return 'named';
        return 'declaration';
    }

    /**
     * 解析import说明符
     * @param {string} importStatement import语句
     * @returns {Array} 说明符数组
     */
    parseImportSpecifiers(importStatement) {
        const specifiers = [];

        // 解析命名导入 { a, b as c }
        const namedMatch = importStatement.match(/\{\s*([^}]+)\s*\}/);
        if (namedMatch) {
            const names = namedMatch[1].split(',').map(name => name.trim());
            for (const name of names) {
                const asMatch = name.match(/([a-zA-Z_$][a-zA-Z0-9_$]*)\s+as\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
                if (asMatch) {
                    specifiers.push({ imported: asMatch[1], local: asMatch[2] });
                } else {
                    specifiers.push({ imported: name, local: name });
                }
            }
        }

        // 解析默认导入
        const defaultMatch = importStatement.match(/import\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s+from/);
        if (defaultMatch) {
            specifiers.push({ imported: 'default', local: defaultMatch[1] });
        }

        // 解析命名空间导入
        const namespaceMatch = importStatement.match(/import\s*\*\s*as\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
        if (namespaceMatch) {
            specifiers.push({ imported: '*', local: namespaceMatch[1] });
        }

        return specifiers;
    }

    /**
     * 解析export说明符
     * @param {string} exportStatement export语句
     * @returns {Array} 说明符数组
     */
    parseExportSpecifiers(exportStatement) {
        const specifiers = [];

        // 解析命名导出 { a, b as c }
        const namedMatch = exportStatement.match(/\{\s*([^}]+)\s*\}/);
        if (namedMatch) {
            const names = namedMatch[1].split(',').map(name => name.trim());
            for (const name of names) {
                const asMatch = name.match(/([a-zA-Z_$][a-zA-Z0-9_$]*)\s+as\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
                if (asMatch) {
                    specifiers.push({ local: asMatch[1], exported: asMatch[2] });
                } else {
                    specifiers.push({ local: name, exported: name });
                }
            }
        }

        return specifiers;
    }

    /**
     * 拓扑排序，确定模块加载顺序
     * @returns {string[]} 按依赖顺序排列的模块路径数组
     */
    topologicalSort() {
        const sorted = [];
        const visited = new Set();
        const visiting = new Set();

        const visit = (modulePath) => {
            if (visiting.has(modulePath)) {
                throw new Error(`检测到循环依赖，涉及模块: ${modulePath}`);
            }

            if (visited.has(modulePath)) {
                return;
            }

            visiting.add(modulePath);

            const dependencies = this.dependencyGraph.get(modulePath) || new Set();
            for (const dep of dependencies) {
                visit(dep);
            }

            visiting.delete(modulePath);
            visited.add(modulePath);
            sorted.push(modulePath);
        };

        // 访问所有模块
        for (const modulePath of this.modules.keys()) {
            visit(modulePath);
        }

        return sorted;
    }

    /**
     * 解析模块路径
     * @param {string} modulePath 模块路径
     * @param {string} basePath 基础路径
     * @returns {string} 解析后的绝对路径
     */
    resolvePath(modulePath, basePath = process.cwd()) {
        const cacheKey = `${basePath}:${modulePath}`;

        if (this.resolveCache.has(cacheKey)) {
            return this.resolveCache.get(cacheKey);
        }

        let resolvedPath;

        // 处理相对路径
        if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
            resolvedPath = path.resolve(basePath, modulePath);
        } else if (modulePath.startsWith('/')) {
            // 绝对路径
            resolvedPath = modulePath;
        } else {
            // 处理别名
            const alias = this.config.resolve?.alias || {};
            for (const [aliasKey, aliasPath] of Object.entries(alias)) {
                if (modulePath.startsWith(aliasKey)) {
                    const relativePath = modulePath.substring(aliasKey.length);
                    resolvedPath = path.join(aliasPath, relativePath);
                    break;
                }
            }

            if (!resolvedPath) {
                // 默认相对于src目录
                resolvedPath = path.resolve(basePath, modulePath);
            }
        }

        // 添加.js扩展名（如果没有扩展名）
        if (!path.extname(resolvedPath)) {
            resolvedPath += '.js';
        }

        resolvedPath = BuildUtils.normalizePath(resolvedPath);
        this.resolveCache.set(cacheKey, resolvedPath);

        return resolvedPath;
    }

    /**
     * 获取模块信息
     * @param {string} modulePath 模块路径
     * @returns {Object} 模块信息
     */
    getModuleInfo(modulePath) {
        return this.modules.get(modulePath);
    }

    /**
     * 获取所有模块信息
     * @returns {Map} 所有模块信息
     */
    getAllModules() {
        return this.modules;
    }
}

module.exports = DependencyAnalyzer;
