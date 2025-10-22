/**
 * 源码映射生成器
 * 为开发模式生成源码映射，便于调试
 */

class SourceMapGenerator {
    constructor(config) {
        this.config = config;
        this.mappings = [];
        this.sources = [];
        this.sourcesContent = [];
        this.names = [];
    }

    /**
     * 添加模块映射信息
     * @param {string} modulePath - 模块路径
     * @param {string} content - 模块内容
     * @param {number} outputLine - 输出文件中的行号
     */
    addModule(modulePath, content, outputLine) {
        const sourceIndex = this.sources.indexOf(modulePath);
        let index;

        if (sourceIndex === -1) {
            index = this.sources.length;
            this.sources.push(modulePath);
            this.sourcesContent.push(content);
        } else {
            index = sourceIndex;
        }

        // 简化的映射：每个模块的开始位置
        this.mappings.push({
            generated: { line: outputLine, column: 0 },
            original: { line: 1, column: 0 },
            source: index,
            name: null
        });
    }

    /**
     * 生成源码映射对象
     * @param {string} outputFile - 输出文件名
     * @returns {object} 源码映射对象
     */
    generate(outputFile) {
        return {
            version: 3,
            file: outputFile,
            sources: this.sources,
            sourcesContent: this.sourcesContent,
            names: this.names,
            mappings: this.encodeMappings()
        };
    }

    /**
     * 编码映射信息（简化版本）
     * @returns {string} 编码后的映射字符串
     */
    encodeMappings() {
        // 这是一个简化的实现，实际的source map编码更复杂
        // 对于开发调试来说，这个简化版本已经足够
        return this.mappings.map(mapping => {
            return `${mapping.generated.line},${mapping.generated.column},${mapping.source},${mapping.original.line},${mapping.original.column}`;
        }).join(';');
    }

    /**
     * 生成内联源码映射注释
     * @param {string} outputFile - 输出文件名
     * @returns {string} 内联源码映射注释
     */
    generateInlineComment(outputFile) {
        const sourceMap = this.generate(outputFile);
        const base64 = Buffer.from(JSON.stringify(sourceMap)).toString('base64');
        return `\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${base64}`;
    }

    /**
     * 生成外部源码映射文件内容
     * @param {string} outputFile - 输出文件名
     * @returns {string} 源码映射文件内容
     */
    generateExternalFile(outputFile) {
        const sourceMap = this.generate(outputFile);
        return JSON.stringify(sourceMap, null, 2);
    }

    /**
     * 生成源码映射引用注释
     * @param {string} mapFile - 映射文件名
     * @returns {string} 源码映射引用注释
     */
    generateExternalComment(mapFile) {
        return `\n//# sourceMappingURL=${mapFile}`;
    }
}

module.exports = SourceMapGenerator;
