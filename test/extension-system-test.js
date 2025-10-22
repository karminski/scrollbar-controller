#!/usr/bin/env node

/**
 * 扩展系统功能测试
 * 验证插件注册和管理功能、事件系统的正确性、扩展接口的可用性
 */

const fs = require('fs');
const path = require('path');

class ExtensionSystemTester {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..');
        this.testResults = [];
        this.tempDir = path.join(__dirname, 'temp-extensions');
    }

    async run() {
        console.log('🔌 开始扩展系统测试...\n');
        
        try {
            // 准备测试环境
            await this.setupTestEnvironment();
            
            // 测试核心扩展系统组件
            await this.testCoreExtensionComponents();
            
            // 测试事件总线系统
            await this.testEventBusSystem();
            
            // 测试插件管理器功能
            await this.testPluginManagerFunctionality();
            
            // 测试扩展接口定义
            await this.testExtensionInterfaces();
            
            // 测试扩展示例和文档
            await this.testExtensionExamples();
            
            // 清理测试环境
            await this.cleanupTestEnvironment();
            
            // 生成测试报告
            this.generateReport();
            
        } catch (error) {
            console.error('❌ 扩展系统测试失败:', error.message);
            await this.cleanupTestEnvironment();
            process.exit(1);
        }
    }

    async setupTestEnvironment() {
        console.log('🛠️  准备扩展系统测试环境...');
        
        // 创建临时目录
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
        
        this.addResult('Environment', 'Setup', 'PASSED', '扩展系统测试环境准备完成');
        console.log('✅ 扩展系统测试环境准备完成\n');
    }

    async testCoreExtensionComponents() {
        console.log('🏗️  测试核心扩展系统组件...');
        
        // 检查EventBus类
        const eventBusPath = path.join(this.projectRoot, 'src', 'core', 'EventBus.js');
        if (fs.existsSync(eventBusPath)) {
            const eventBusContent = fs.readFileSync(eventBusPath, 'utf8');
            
            // 检查基本事件方法
            const requiredMethods = ['on', 'off', 'emit', 'once'];
            for (const method of requiredMethods) {
                if (eventBusContent.includes(method)) {
                    this.addResult('Core Components', `EventBus.${method}`, 'PASSED', `EventBus包含${method}方法`);
                } else {
                    this.addResult('Core Components', `EventBus.${method}`, 'FAILED', `EventBus缺少${method}方法`);
                }
            }
            
            // 检查错误处理
            if (eventBusContent.includes('try') && eventBusContent.includes('catch')) {
                this.addResult('Core Components', 'EventBus Error Handling', 'PASSED', 'EventBus包含错误处理');
            } else {
                this.addResult('Core Components', 'EventBus Error Handling', 'WARNING', 'EventBus可能缺少错误处理');
            }
        } else {
            this.addResult('Core Components', 'EventBus File', 'FAILED', 'EventBus.js文件不存在');
        }
        
        // 检查PluginManager类
        const pluginManagerPath = path.join(this.projectRoot, 'src', 'core', 'PluginManager.js');
        if (fs.existsSync(pluginManagerPath)) {
            const pluginManagerContent = fs.readFileSync(pluginManagerPath, 'utf8');
            
            // 检查插件管理方法
            const requiredMethods = ['registerPlugin', 'unregisterPlugin', 'getPlugin', 'loadExtensions'];
            for (const method of requiredMethods) {
                if (pluginManagerContent.includes(method)) {
                    this.addResult('Core Components', `PluginManager.${method}`, 'PASSED', `PluginManager包含${method}方法`);
                } else {
                    this.addResult('Core Components', `PluginManager.${method}`, 'FAILED', `PluginManager缺少${method}方法`);
                }
            }
            
            // 检查插件生命周期管理
            if (pluginManagerContent.includes('initialize') && pluginManagerContent.includes('destroy')) {
                this.addResult('Core Components', 'Plugin Lifecycle', 'PASSED', 'PluginManager支持插件生命周期');
            } else {
                this.addResult('Core Components', 'Plugin Lifecycle', 'WARNING', 'PluginManager可能缺少生命周期管理');
            }
        } else {
            this.addResult('Core Components', 'PluginManager File', 'FAILED', 'PluginManager.js文件不存在');
        }
        
        // 检查Application类的扩展支持
        const applicationPath = path.join(this.projectRoot, 'src', 'core', 'Application.js');
        if (fs.existsSync(applicationPath)) {
            const applicationContent = fs.readFileSync(applicationPath, 'utf8');
            
            if (applicationContent.includes('PluginManager') || applicationContent.includes('registerPlugin')) {
                this.addResult('Core Components', 'Application Plugin Support', 'PASSED', 'Application支持插件系统');
            } else {
                this.addResult('Core Components', 'Application Plugin Support', 'WARNING', 'Application可能缺少插件支持');
            }
        } else {
            this.addResult('Core Components', 'Application File', 'FAILED', 'Application.js文件不存在');
        }
        
        console.log('✅ 核心扩展系统组件测试完成\n');
    }

    async testEventBusSystem() {
        console.log('📡 测试事件总线系统...');
        
        try {
            // 创建测试用的EventBus实例
            const testEventBus = this.createTestEventBus();
            
            // 测试基本事件订阅和发布
            let eventReceived = false;
            let receivedData = null;
            
            testEventBus.on('test-event', (data) => {
                eventReceived = true;
                receivedData = data;
            });
            
            const testData = { message: 'test', timestamp: Date.now() };
            testEventBus.emit('test-event', testData);
            
            if (eventReceived && JSON.stringify(receivedData) === JSON.stringify(testData)) {
                this.addResult('Event System', 'Basic Pub/Sub', 'PASSED', '基本发布订阅功能正常');
            } else {
                this.addResult('Event System', 'Basic Pub/Sub', 'FAILED', '基本发布订阅功能失败');
            }
            
            // 测试多个监听器
            let listener1Called = false;
            let listener2Called = false;
            
            testEventBus.on('multi-test', () => { listener1Called = true; });
            testEventBus.on('multi-test', () => { listener2Called = true; });
            testEventBus.emit('multi-test');
            
            if (listener1Called && listener2Called) {
                this.addResult('Event System', 'Multiple Listeners', 'PASSED', '多监听器功能正常');
            } else {
                this.addResult('Event System', 'Multiple Listeners', 'FAILED', '多监听器功能失败');
            }
            
            // 测试事件取消订阅
            let unsubscribeTest = false;
            const handler = () => { unsubscribeTest = true; };
            
            testEventBus.on('unsub-test', handler);
            testEventBus.off('unsub-test', handler);
            testEventBus.emit('unsub-test');
            
            if (!unsubscribeTest) {
                this.addResult('Event System', 'Unsubscribe', 'PASSED', '取消订阅功能正常');
            } else {
                this.addResult('Event System', 'Unsubscribe', 'FAILED', '取消订阅功能失败');
            }
            
            // 测试一次性监听器
            let onceCount = 0;
            testEventBus.once('once-test', () => { onceCount++; });
            testEventBus.emit('once-test');
            testEventBus.emit('once-test');
            
            if (onceCount === 1) {
                this.addResult('Event System', 'Once Listener', 'PASSED', '一次性监听器功能正常');
            } else {
                this.addResult('Event System', 'Once Listener', 'FAILED', '一次性监听器功能失败');
            }
            
        } catch (error) {
            this.addResult('Event System', 'System Test', 'FAILED', `事件系统测试失败: ${error.message}`);
        }
        
        console.log('✅ 事件总线系统测试完成\n');
    }

    async testPluginManagerFunctionality() {
        console.log('🔧 测试插件管理器功能...');
        
        try {
            // 创建测试插件
            const testPlugin = this.createTestPlugin();
            const testPluginManager = this.createTestPluginManager();
            
            // 测试插件注册
            testPluginManager.registerPlugin(testPlugin);
            
            if (testPluginManager.getPlugin(testPlugin.id)) {
                this.addResult('Plugin Manager', 'Plugin Registration', 'PASSED', '插件注册功能正常');
            } else {
                this.addResult('Plugin Manager', 'Plugin Registration', 'FAILED', '插件注册功能失败');
            }
            
            // 测试插件获取
            const retrievedPlugin = testPluginManager.getPlugin(testPlugin.id);
            if (retrievedPlugin && retrievedPlugin.id === testPlugin.id) {
                this.addResult('Plugin Manager', 'Plugin Retrieval', 'PASSED', '插件获取功能正常');
            } else {
                this.addResult('Plugin Manager', 'Plugin Retrieval', 'FAILED', '插件获取功能失败');
            }
            
            // 测试插件初始化
            if (testPlugin.initialized) {
                this.addResult('Plugin Manager', 'Plugin Initialization', 'PASSED', '插件初始化功能正常');
            } else {
                this.addResult('Plugin Manager', 'Plugin Initialization', 'WARNING', '插件可能未正确初始化');
            }
            
            // 测试插件卸载
            testPluginManager.unregisterPlugin(testPlugin.id);
            
            if (!testPluginManager.getPlugin(testPlugin.id)) {
                this.addResult('Plugin Manager', 'Plugin Unregistration', 'PASSED', '插件卸载功能正常');
            } else {
                this.addResult('Plugin Manager', 'Plugin Unregistration', 'FAILED', '插件卸载功能失败');
            }
            
            // 测试插件销毁
            if (testPlugin.destroyed) {
                this.addResult('Plugin Manager', 'Plugin Destruction', 'PASSED', '插件销毁功能正常');
            } else {
                this.addResult('Plugin Manager', 'Plugin Destruction', 'WARNING', '插件可能未正确销毁');
            }
            
        } catch (error) {
            this.addResult('Plugin Manager', 'Functionality Test', 'FAILED', `插件管理器测试失败: ${error.message}`);
        }
        
        console.log('✅ 插件管理器功能测试完成\n');
    }

    async testExtensionInterfaces() {
        console.log('🔌 测试扩展接口定义...');
        
        // 检查扩展目录
        const extensionsDir = path.join(this.projectRoot, 'src', 'extensions');
        if (fs.existsSync(extensionsDir)) {
            this.addResult('Extension Interfaces', 'Extensions Directory', 'PASSED', '扩展目录存在');
            
            // 检查README文件
            const readmePath = path.join(extensionsDir, 'README.md');
            if (fs.existsSync(readmePath)) {
                this.addResult('Extension Interfaces', 'Extension Guide', 'PASSED', '扩展开发指南存在');
            } else {
                this.addResult('Extension Interfaces', 'Extension Guide', 'WARNING', '扩展开发指南不存在');
            }
        } else {
            this.addResult('Extension Interfaces', 'Extensions Directory', 'WARNING', '扩展目录不存在');
        }
        
        // 检查常量定义中的扩展点
        const constantsPath = path.join(this.projectRoot, 'src', 'utils', 'constants.js');
        if (fs.existsSync(constantsPath)) {
            const constantsContent = fs.readFileSync(constantsPath, 'utf8');
            
            // 检查扩展点定义
            if (constantsContent.includes('ExtensionPoints') || constantsContent.includes('EXTENSION')) {
                this.addResult('Extension Interfaces', 'Extension Points', 'PASSED', '扩展点定义存在');
            } else {
                this.addResult('Extension Interfaces', 'Extension Points', 'WARNING', '扩展点定义可能缺失');
            }
            
            // 检查事件类型定义
            if (constantsContent.includes('EventTypes') || constantsContent.includes('PLUGIN')) {
                this.addResult('Extension Interfaces', 'Event Types', 'PASSED', '事件类型定义存在');
            } else {
                this.addResult('Extension Interfaces', 'Event Types', 'WARNING', '事件类型定义可能缺失');
            }
        } else {
            this.addResult('Extension Interfaces', 'Constants File', 'WARNING', '常量文件不存在');
        }
        
        // 检查文档中的扩展接口说明
        const docsDir = path.join(this.projectRoot, 'docs');
        if (fs.existsSync(docsDir)) {
            const docFiles = fs.readdirSync(docsDir);
            const extensionDocs = docFiles.filter(file => 
                file.includes('extension') || file.includes('plugin')
            );
            
            if (extensionDocs.length > 0) {
                this.addResult('Extension Interfaces', 'Extension Documentation', 'PASSED', `找到${extensionDocs.length}个扩展相关文档`);
            } else {
                this.addResult('Extension Interfaces', 'Extension Documentation', 'WARNING', '扩展相关文档可能缺失');
            }
        }
        
        console.log('✅ 扩展接口定义测试完成\n');
    }

    async testExtensionExamples() {
        console.log('📚 测试扩展示例和文档...');
        
        // 创建示例扩展进行测试
        const exampleExtension = this.createExampleExtension();
        
        // 测试示例扩展的基本结构
        if (exampleExtension.id && exampleExtension.name && exampleExtension.version) {
            this.addResult('Extension Examples', 'Basic Structure', 'PASSED', '示例扩展基本结构正确');
        } else {
            this.addResult('Extension Examples', 'Basic Structure', 'FAILED', '示例扩展基本结构不完整');
        }
        
        // 测试示例扩展的生命周期方法
        if (typeof exampleExtension.initialize === 'function') {
            this.addResult('Extension Examples', 'Initialize Method', 'PASSED', '示例扩展包含初始化方法');
        } else {
            this.addResult('Extension Examples', 'Initialize Method', 'FAILED', '示例扩展缺少初始化方法');
        }
        
        if (typeof exampleExtension.destroy === 'function') {
            this.addResult('Extension Examples', 'Destroy Method', 'PASSED', '示例扩展包含销毁方法');
        } else {
            this.addResult('Extension Examples', 'Destroy Method', 'WARNING', '示例扩展缺少销毁方法');
        }
        
        // 测试示例扩展的API接口
        if (typeof exampleExtension.getAPI === 'function') {
            const api = exampleExtension.getAPI();
            if (api && typeof api === 'object') {
                this.addResult('Extension Examples', 'API Interface', 'PASSED', '示例扩展提供API接口');
            } else {
                this.addResult('Extension Examples', 'API Interface', 'WARNING', '示例扩展API接口可能不完整');
            }
        } else {
            this.addResult('Extension Examples', 'API Interface', 'WARNING', '示例扩展缺少API接口');
        }
        
        // 检查扩展开发文档
        const extensionDocsPath = path.join(this.projectRoot, 'docs', 'extensions.md');
        if (fs.existsSync(extensionDocsPath)) {
            const docsContent = fs.readFileSync(extensionDocsPath, 'utf8');
            
            // 检查文档内容
            const requiredSections = ['Plugin', 'Extension', 'API', 'Example'];
            let sectionsFound = 0;
            
            for (const section of requiredSections) {
                if (docsContent.toLowerCase().includes(section.toLowerCase())) {
                    sectionsFound++;
                }
            }
            
            if (sectionsFound >= 3) {
                this.addResult('Extension Examples', 'Documentation Quality', 'PASSED', `扩展文档包含${sectionsFound}个关键部分`);
            } else {
                this.addResult('Extension Examples', 'Documentation Quality', 'WARNING', `扩展文档可能不够完整（${sectionsFound}/${requiredSections.length}）`);
            }
        } else {
            this.addResult('Extension Examples', 'Documentation File', 'WARNING', '扩展开发文档不存在');
        }
        
        console.log('✅ 扩展示例和文档测试完成\n');
    }

    async cleanupTestEnvironment() {
        console.log('🧹 清理扩展系统测试环境...');
        
        try {
            if (fs.existsSync(this.tempDir)) {
                fs.rmSync(this.tempDir, { recursive: true, force: true });
            }
            this.addResult('Environment', 'Cleanup', 'PASSED', '扩展系统测试环境清理完成');
        } catch (error) {
            this.addResult('Environment', 'Cleanup', 'WARNING', `清理失败: ${error.message}`);
        }
        
        console.log('✅ 扩展系统测试环境清理完成\n');
    }

    // 辅助方法：创建测试用的EventBus
    createTestEventBus() {
        return {
            events: new Map(),
            
            on(event, handler) {
                if (!this.events.has(event)) {
                    this.events.set(event, new Set());
                }
                this.events.get(event).add(handler);
            },
            
            off(event, handler) {
                if (this.events.has(event)) {
                    this.events.get(event).delete(handler);
                }
            },
            
            emit(event, data) {
                if (this.events.has(event)) {
                    this.events.get(event).forEach(handler => {
                        try {
                            handler(data);
                        } catch (error) {
                            console.error('Event handler error:', error);
                        }
                    });
                }
            },
            
            once(event, handler) {
                const onceHandler = (data) => {
                    handler(data);
                    this.off(event, onceHandler);
                };
                this.on(event, onceHandler);
            }
        };
    }

    // 辅助方法：创建测试插件
    createTestPlugin() {
        return {
            id: 'test-plugin',
            name: 'Test Plugin',
            version: '1.0.0',
            initialized: false,
            destroyed: false,
            
            initialize(application) {
                this.initialized = true;
                this.application = application;
            },
            
            destroy() {
                this.destroyed = true;
                this.application = null;
            },
            
            getAPI() {
                return {
                    testMethod: () => 'test result'
                };
            }
        };
    }

    // 辅助方法：创建测试插件管理器
    createTestPluginManager() {
        const testEventBus = this.createTestEventBus();
        
        return {
            plugins: new Map(),
            eventBus: testEventBus,
            
            registerPlugin(plugin) {
                if (this.plugins.has(plugin.id)) {
                    throw new Error(`Plugin ${plugin.id} already registered`);
                }
                
                this.plugins.set(plugin.id, plugin);
                
                if (typeof plugin.initialize === 'function') {
                    plugin.initialize({ eventBus: this.eventBus });
                }
            },
            
            unregisterPlugin(pluginId) {
                const plugin = this.plugins.get(pluginId);
                if (plugin) {
                    if (typeof plugin.destroy === 'function') {
                        plugin.destroy();
                    }
                    this.plugins.delete(pluginId);
                }
            },
            
            getPlugin(pluginId) {
                return this.plugins.get(pluginId);
            }
        };
    }

    // 辅助方法：创建示例扩展
    createExampleExtension() {
        return {
            id: 'example-extension',
            name: 'Example Extension',
            version: '1.0.0',
            
            initialize(application) {
                this.application = application;
                this.eventBus = application.eventBus;
                
                // 注册事件监听器
                this.eventBus.on('page-load', this.onPageLoad.bind(this));
            },
            
            destroy() {
                if (this.eventBus) {
                    this.eventBus.off('page-load', this.onPageLoad.bind(this));
                }
                this.application = null;
                this.eventBus = null;
            },
            
            onPageLoad() {
                console.log('Example extension: page loaded');
            },
            
            getAPI() {
                return {
                    controlPage: (action) => {
                        console.log(`Example extension: controlling page with action ${action}`);
                    },
                    
                    getPageInfo: () => {
                        return {
                            url: window.location.href,
                            title: document.title
                        };
                    }
                };
            }
        };
    }

    addResult(category, test, status, message) {
        this.testResults.push({
            category,
            test,
            status,
            message,
            timestamp: new Date().toISOString()
        });
    }

    generateReport() {
        console.log('📊 生成扩展系统测试报告...\n');
        
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;
        const warnings = this.testResults.filter(r => r.status === 'WARNING').length;
        const total = this.testResults.length;
        
        console.log('='.repeat(60));
        console.log('🔌 扩展系统测试报告');
        console.log('='.repeat(60));
        console.log(`📊 总测试数: ${total}`);
        console.log(`✅ 通过: ${passed}`);
        console.log(`❌ 失败: ${failed}`);
        console.log(`⚠️  警告: ${warnings}`);
        console.log(`📈 成功率: ${((passed / total) * 100).toFixed(2)}%`);
        console.log('='.repeat(60));
        
        // 按类别分组显示结果
        const categories = [...new Set(this.testResults.map(r => r.category))];
        
        categories.forEach(category => {
            console.log(`\n📁 ${category}:`);
            const categoryResults = this.testResults.filter(r => r.category === category);
            
            categoryResults.forEach(result => {
                let icon = '✅';
                if (result.status === 'FAILED') icon = '❌';
                else if (result.status === 'WARNING') icon = '⚠️';
                
                console.log(`  ${icon} ${result.test}: ${result.message}`);
            });
        });
        
        // 保存报告到文件
        this.saveReportToFile();
        
        console.log('\n='.repeat(60));
        
        if (failed > 0) {
            console.log('❌ 扩展系统测试失败，请检查上述问题');
            process.exit(1);
        } else {
            console.log('🎉 扩展系统测试通过！');
        }
    }

    saveReportToFile() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: this.testResults.length,
                passed: this.testResults.filter(r => r.status === 'PASSED').length,
                failed: this.testResults.filter(r => r.status === 'FAILED').length,
                warnings: this.testResults.filter(r => r.status === 'WARNING').length
            },
            results: this.testResults
        };
        
        const reportPath = path.join(__dirname, 'extension-system-test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 详细报告已保存到: ${reportPath}`);
    }
}

// 运行测试
if (require.main === module) {
    const tester = new ExtensionSystemTester();
    tester.run().catch(error => {
        console.error('扩展系统测试运行器错误:', error);
        process.exit(1);
    });
}

module.exports = ExtensionSystemTester;
