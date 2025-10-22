/**
 * 构建配置文件
 * 定义构建过程的各种参数和设置
 */

const path = require('path');

const buildConfig = {
    // 入口文件
    entry: 'src/main.js',

    // 输出文件
    output: 'dist/scrollbar-control.user.js',

    // 源代码目录
    srcDir: 'src',

    // 构建输出目录
    distDir: 'dist',

    // 油猴脚本元数据
    userscriptMeta: {
        name: 'Scrollbar Controller',
        namespace: 'http://tampermonkey.net/',
        version: '2.0.0',
        description: '提供对网页滚动条显示的精细控制，支持三种显示模式和自动滚动',
        author: 'karminski-牙医',
        match: '*://*/*',
        grant: 'none',
        runAt: 'document-end',
        noframes: true
    },

    // 构建选项
    options: {
        minify: true,
        sourcemap: false,
        removeComments: true,
        preserveConsole: false,
        generateReport: true
    },

    // 开发模式配置
    development: {
        output: 'dist/scrollbar-control.dev.user.js',
        options: {
            minify: false,
            sourcemap: true,
            removeComments: false,
            preserveConsole: true,
            generateReport: true,
            addDebugInfo: true
        },
        userscriptMeta: {
            name: 'Scrollbar Controller (Development)',
            version: '2.0.0-dev'
        }
    },

    // 监听模式配置
    watch: {
        enabled: false,
        debounceMs: 500,
        ignored: [
            'node_modules/**',
            'dist/**',
            'coverage/**',
            '**/*.log',
            '.git/**'
        ],
        extensions: ['.js']
    },

    // 模块解析配置
    resolve: {
        extensions: ['.js'],
        alias: {
            '@': path.resolve(process.cwd(), 'src'),
            '@core': path.resolve(process.cwd(), 'src/core'),
            '@managers': path.resolve(process.cwd(), 'src/managers'),
            '@ui': path.resolve(process.cwd(), 'src/ui'),
            '@detectors': path.resolve(process.cwd(), 'src/detectors'),
            '@utils': path.resolve(process.cwd(), 'src/utils'),
            '@extensions': path.resolve(process.cwd(), 'src/extensions')
        }
    }
};

module.exports = buildConfig;
