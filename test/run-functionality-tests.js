#!/usr/bin/env node

/**
 * 功能完整性测试运行器
 */

const fs = require('fs');
const path = require('path');

class TestRunner {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..');
        this.distPath = path.join(this.projectRoot, 'dist', 'scrollbar-control.user.js');
        this.testResults = [];
    }

    async run() {
        console.log('🚀 开始运行功能完整性测试...\n');
        
        try {
            // 检查构建产物是否存在
            await this.checkBuildOutput();
            
            // 测试构建产物的基本结构
            await this.testBuildStructure();
            
            // 测试脚本语法正确性
            await this.testScriptSyntax();
            
            // 测试模块系统
            await this.testModuleSystem();
            
            // 测试核心功能
            await this.testCoreFunctionality();
            
            // 生成测试报告
            this.generateReport();
            
        } catch (error) {
            console.error('❌ 测试运行失败:', error.message);
            process.exit(1);
        }
    }

    async checkBuildOutput() {
        console.log('📋 检查构建产物...');
        
        if (!fs.existsSync(this.distPath)) {
            throw new Error('构建产物不存在，请先运行构建命令');
        }
        
        const stats = fs.statSync(this.distPath);
        if (stats.size === 0) {
            throw new Error('构建产物为空文件');
        }
        
        this.addResult('Build Output', 'File Existence', 'PASSED', `文件大小: ${stats.size} bytes`);
        console.log('✅ 构建产物检查通过\n');
    }

    async testBuildStructure() {
        console.log('🏗️  测试构建结构...');
        
        const content = fs.readFileSync(this.distPath, 'utf8');
        
        // 检查油猴脚本头部
        if (content.includes('// ==UserScript==') && content.includes('// ==/UserScript==')) {
            this.addResult('Build Structure', 'UserScript Header', 'PASSED', '油猴脚本头部正确');
        } else {
            this.addResult('Build Structure', 'UserScript Header', 'FAILED', '缺少油猴脚本头部');
        }
        
        // 检查模块系统
        if (content.includes('__modules') && content.includes('__require')) {
            this.addResult('Build Structure', 'Module System', 'PASSED', '模块系统存在');
        } else {
            this.addResult('Build Structure', 'Module System', 'FAILED', '模块系统缺失');
        }
        
        // 检查核心模块
        const coreModules = [
            'EventBus',
            'Application',
            'PluginManager',
            'StyleManager',
            'AutoScrollManager',
            'UIController'
        ];
        
        for (const module of coreModules) {
            if (content.includes(module)) {
                this.addResult('Build Structure', `Module ${module}`, 'PASSED', `${module}模块存在`);
            } else {
                this.addResult('Build Structure', `Module ${module}`, 'FAILED', `${module}模块缺失`);
            }
        }
        
        console.log('✅ 构建结构测试完成\n');
    }

    async testScriptSyntax() {
        console.log('📝 测试脚本语法...');
        
        const content = fs.readFileSync(this.distPath, 'utf8');
        
        try {
            // 移除油猴脚本头部，只检查JavaScript代码
            const jsContent = content.replace(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/, '');
            
            // 尝试解析JavaScript语法
            new Function(jsContent);
            this.addResult('Script Syntax', 'JavaScript Parsing', 'PASSED', 'JavaScript语法正确');
            
        } catch (error) {
            this.addResult('Script Syntax', 'JavaScript Parsing', 'FAILED', `语法错误: ${error.message}`);
        }
        
        console.log('✅ 脚本语法测试完成\n');
    }

    async testModuleSystem() {
        console.log('🔧 测试模块系统...');
        
        const content = fs.readFileSync(this.distPath, 'utf8');
        
        // 检查模块定义
        const moduleDefineRegex = /__define\(['"]([^'"]+)['"],/g;
        const modules = [];
        let match;
        
        while ((match = moduleDefineRegex.exec(content)) !== null) {
            modules.push(match[1]);
        }
        
        if (modules.length > 0) {
            this.addResult('Module System', 'Module Definitions', 'PASSED', `找到${modules.length}个模块定义`);
        } else {
            this.addResult('Module System', 'Module Definitions', 'FAILED', '未找到模块定义');
        }
        
        // 检查主入口
        if (content.includes('main.js') || content.includes('Application')) {
            this.addResult('Module System', 'Main Entry', 'PASSED', '主入口存在');
        } else {
            this.addResult('Module System', 'Main Entry', 'FAILED', '主入口缺失');
        }
        
        console.log('✅ 模块系统测试完成\n');
    }

    async testCoreFunctionality() {
        console.log('⚙️  测试核心功能...');
        
        const content = fs.readFileSync(this.distPath, 'utf8');
        
        // 测试事件系统
        if (content.includes('EventBus') && content.includes('on') && content.includes('emit')) {
            this.addResult('Core Functionality', 'Event System', 'PASSED', '事件系统功能完整');
        } else {
            this.addResult('Core Functionality', 'Event System', 'FAILED', '事件系统功能缺失');
        }
        
        // 测试样式管理
        if (content.includes('StyleManager') && content.includes('setMode')) {
            this.addResult('Core Functionality', 'Style Management', 'PASSED', '样式管理功能存在');
        } else {
            this.addResult('Core Functionality', 'Style Management', 'FAILED', '样式管理功能缺失');
        }
        
        // 测试自动滚动
        if (content.includes('AutoScrollManager') && content.includes('startAutoScroll')) {
            this.addResult('Core Functionality', 'Auto Scroll', 'PASSED', '自动滚动功能存在');
        } else {
            this.addResult('Core Functionality', 'Auto Scroll', 'FAILED', '自动滚动功能缺失');
        }
        
        // 测试UI控制
        if (content.includes('UIController') && content.includes('ControlDot')) {
            this.addResult('Core Functionality', 'UI Control', 'PASSED', 'UI控制功能存在');
        } else {
            this.addResult('Core Functionality', 'UI Control', 'FAILED', 'UI控制功能缺失');
        }
        
        // 测试键盘处理
        if (content.includes('KeyboardHandler') && content.includes('keydown')) {
            this.addResult('Core Functionality', 'Keyboard Handling', 'PASSED', '键盘处理功能存在');
        } else {
            this.addResult('Core Functionality', 'Keyboard Handling', 'FAILED', '键盘处理功能缺失');
        }
        
        console.log('✅ 核心功能测试完成\n');
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
        console.log('📊 生成测试报告...\n');
        
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;
        const total = this.testResults.length;
        
        console.log('='.repeat(60));
        console.log('📋 功能完整性测试报告');
        console.log('='.repeat(60));
        console.log(`📊 总测试数: ${total}`);
        console.log(`✅ 通过: ${passed}`);
        console.log(`❌ 失败: ${failed}`);
        console.log(`📈 成功率: ${((passed / total) * 100).toFixed(2)}%`);
        console.log('='.repeat(60));
        
        // 按类别分组显示结果
        const categories = [...new Set(this.testResults.map(r => r.category))];
        
        categories.forEach(category => {
            console.log(`\n📁 ${category}:`);
            const categoryResults = this.testResults.filter(r => r.category === category);
            
            categoryResults.forEach(result => {
                const icon = result.status === 'PASSED' ? '✅' : '❌';
                console.log(`  ${icon} ${result.test}: ${result.message}`);
            });
        });
        
        // 保存报告到文件
        this.saveReportToFile();
        
        console.log('\n='.repeat(60));
        
        if (failed > 0) {
            console.log('❌ 测试失败，请检查上述问题');
            process.exit(1);
        } else {
            console.log('🎉 所有测试通过！');
        }
    }

    saveReportToFile() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: this.testResults.length,
                passed: this.testResults.filter(r => r.status === 'PASSED').length,
                failed: this.testResults.filter(r => r.status === 'FAILED').length
            },
            results: this.testResults
        };
        
        const reportPath = path.join(__dirname, 'functionality-test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 详细报告已保存到: ${reportPath}`);
    }
}

// 运行测试
if (require.main === module) {
    const runner = new TestRunner();
    runner.run().catch(error => {
        console.error('测试运行器错误:', error);
        process.exit(1);
    });
}

module.exports = TestRunner;
