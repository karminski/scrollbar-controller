/**
 * 文件监听器
 * 使用chokidar提供更可靠的文件监听功能
 */

let chokidar;
try {
    chokidar = require('chokidar');
} catch (error) {
    // chokidar is optional, only needed for watch mode
    chokidar = null;
}
const path = require('path');
const BuildUtils = require('./utils');

class FileWatcher {
    constructor(config, buildCallback) {
        this.config = config;
        this.buildCallback = buildCallback;
        this.watcher = null;
        this.buildTimeout = null;
        this.isBuilding = false;
        this.watchConfig = config.watch || {};
    }

    /**
     * 启动文件监听
     */
    start() {
        if (!chokidar) {
            BuildUtils.log('chokidar 未安装，跳过文件监听功能', 'warn');
            return false;
        }

        const watchPaths = [
            path.resolve(this.config.srcDir),
            path.resolve('build')
        ];

        const watchOptions = {
            ignored: this.watchConfig.ignored || [
                'node_modules/**',
                'dist/**',
                'coverage/**',
                '**/*.log',
                '.git/**'
            ],
            persistent: true,
            ignoreInitial: true,
            followSymlinks: true,
            cwd: process.cwd(),
            disableGlobbing: false,
            usePolling: false,
            interval: 100,
            binaryInterval: 300,
            alwaysStat: false,
            depth: 99,
            awaitWriteFinish: {
                stabilityThreshold: 100,
                pollInterval: 100
            }
        };

        BuildUtils.log('启动文件监听器...', 'info');

        this.watcher = chokidar.watch(watchPaths, watchOptions);

        // 监听文件变化事件
        this.watcher
            .on('change', (filePath) => this.handleFileChange('change', filePath))
            .on('add', (filePath) => this.handleFileChange('add', filePath))
            .on('unlink', (filePath) => this.handleFileChange('unlink', filePath))
            .on('error', (error) => this.handleError(error))
            .on('ready', () => this.handleReady());

        return this;
    }

    /**
     * 停止文件监听
     */
    async stop() {
        if (this.watcher) {
            BuildUtils.log('停止文件监听器...', 'info');
            await this.watcher.close();
            this.watcher = null;
        }

        if (this.buildTimeout) {
            clearTimeout(this.buildTimeout);
            this.buildTimeout = null;
        }
    }

    /**
     * 处理文件变化
     * @param {string} event - 事件类型
     * @param {string} filePath - 文件路径
     */
    handleFileChange(event, filePath) {
        // 只处理JavaScript文件
        const extensions = this.watchConfig.extensions || ['.js'];
        const ext = path.extname(filePath);

        if (!extensions.includes(ext)) {
            return;
        }

        // 忽略临时文件和备份文件
        const fileName = path.basename(filePath);
        if (fileName.startsWith('.') || fileName.endsWith('~') || fileName.includes('.tmp')) {
            return;
        }

        const relativePath = path.relative(process.cwd(), filePath);
        BuildUtils.log(`检测到文件${event}: ${relativePath}`, 'info');

        // 防抖处理，避免频繁构建
        this.debounceBuild();
    }

    /**
     * 防抖构建
     */
    debounceBuild() {
        if (this.buildTimeout) {
            clearTimeout(this.buildTimeout);
        }

        const debounceMs = this.watchConfig.debounceMs || 500;

        this.buildTimeout = setTimeout(async() => {
            if (this.isBuilding) {
                BuildUtils.log('构建正在进行中，跳过此次触发', 'warn');
                return;
            }

            this.isBuilding = true;

            try {
                BuildUtils.log('开始重新构建...', 'info');
                const startTime = Date.now();

                const success = await this.buildCallback();

                const duration = Date.now() - startTime;
                if (success) {
                    BuildUtils.log(`重新构建完成 (${duration}ms)`, 'success');
                } else {
                    BuildUtils.log(`重新构建失败 (${duration}ms)`, 'error');
                }
            } catch (error) {
                BuildUtils.log(`重新构建出错: ${error.message}`, 'error');
            } finally {
                this.isBuilding = false;
            }
        }, debounceMs);
    }

    /**
     * 处理监听器错误
     * @param {Error} error - 错误对象
     */
    handleError(error) {
        BuildUtils.log(`文件监听器错误: ${error.message}`, 'error');
    }

    /**
     * 处理监听器就绪
     */
    handleReady() {
        const watchedPaths = this.watcher.getWatched();
        const totalFiles = Object.values(watchedPaths).reduce((sum, files) => sum + files.length, 0);

        BuildUtils.log(`文件监听器就绪，正在监听 ${totalFiles} 个文件`, 'success');
        BuildUtils.log('按 Ctrl+C 退出监听模式', 'info');
    }

    /**
     * 获取监听统计信息
     * @returns {object} 监听统计信息
     */
    getStats() {
        if (!this.watcher) {
            return { watching: false };
        }

        const watchedPaths = this.watcher.getWatched();
        const totalFiles = Object.values(watchedPaths).reduce((sum, files) => sum + files.length, 0);

        return {
            watching: true,
            totalFiles,
            watchedPaths: Object.keys(watchedPaths),
            isBuilding: this.isBuilding
        };
    }
}

module.exports = FileWatcher;
