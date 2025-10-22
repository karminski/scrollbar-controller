#!/usr/bin/env node

/**
 * 构建系统功能测试
 * 验证构建脚本的正确性和生成的油猴脚本功能
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BuildSystemTester {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..');
        this.testResults = [];
        this.tempDir = path.join(__dirname, 'temp');
    }

    async run() {
        console.log('🔨 开始构建系统测试...\n');
        
        try {
            // 准备测试环境
            await this.setupTestEnvironment();
            
            // 测试构建脚本基础功能
            await this.testBuildScriptBasics();
            
            // 测试依赖分析功能
            await this.testDependencyAnalysis();
            
            // 测试模块合并功能
            await this.testModuleMerging();
            
            // 测试构建产物生成
            await this.testBuildOutput();
            
            // 测试开发模式构建
            await this.testDevModeBuild();
            
            // 测试构建脚本命令
            await this.testBuildCommands();
            
            // 清理测试环境
            await this.cleanupTestEnvironment();
            
            // 生成测试报告
            this.generateReport();
            
        } catch (error) {
            console.error('❌ 构建系统测试失败:', error.message);
            await this.cleanupTestEnvironment();
            process.exit(1);
        }
    }

    async setupTestEnvironment() {
        console.log('🛠️  准备测试环境...');
        
        // 创建临时目录
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
        
        this.addResult('Environment', 'Setup', 'PASSED', '测试环境准备完成');
        console.log('✅ 测试环境准备完成\n');
    }

    async testBuildScriptBasics() {
        console.log('📋 测试构建脚本基础功能...');
        
        // 检查构建脚本文件是否存在
        const buildScriptPath = path.join(this.projectRoot, 'build', 'build.js');
        if (fs.existsSync(buildScriptPath)) {
            this.addResult('Build Script', 'File Existence', 'PASSED', '构建脚本文件存在');
        } else {
            this.addResult('Build Script', 'File Existence', 'FAILED', '构建脚本文件不存在');
            return;
        }
        
        // 检查构建工具文件
        const buildUtils = [
            'DependencyAnalyzer.js',
            'ModuleMerger.js',
            'OutputGenerator.js',
            'template.js',
            'utils.js'
        ];
        
        for (const util of buildUtils) {
            const utilPath = path.join(this.projectRoot, 'build', util);
            if (fs.existsSync(utilPath)) {
                this.addResult('Build Script', `Utility ${util}`, 'PASSED', `${util}存在`);
            } else {
                this.addResult('Build Script', `Utility ${util}`, 'FAILED', `${util}不存在`);
            }
        }
        
        console.log('✅ 构建脚本基础功能测试完成\n');
    }

    async testDependencyAnalysis() {
        console.log('🔍 测试依赖分析功能...');
        
        try {
            // 创建测试模块文件
            const testModuleA = `
                import { testB } from './testB.js';
                export class TestA {
                    constructor() {
                        this.b = new testB();
                    }
                }
            `;
            
            const testModuleB = `
                export class TestB {
                    constructor() {
                        console.log('TestB initialized');
                    }
                }
            `;
            
            fs.writeFileSync(path.join(this.tempDir, 'testA.js'), testModuleA);
            fs.writeFileSync(path.join(this.tempDir, 'testB.js'), testModuleB);
            
            // 测试依赖分析器
            const DependencyAnalyzer = require(path.join(this.projectRoot, 'build', 'DependencyAnalyzer.js'));
            const analyzer = new DependencyAnalyzer();
            
            const dependencies = analyzer.analyze(path.join(this.tempDir, 'testA.js'));
            
            if (dependencies && dependencies.length > 0) {
                this.addResult('Dependency Analysis', 'Basic Analysis', 'PASSED', `找到${dependencies.length}个依赖`);
            } else {
                this.addResult('Dependency Analysis', 'Basic Analysis', 'FAILED', '依赖分析失败');
            }
            
        } catch (error) {
            this.addResult('Dependency Analysis', 'Basic Analysis', 'FAILED', error.message);
        }
        
        console.log('✅ 依赖分析功能测试完成\n');
    }

    async testModuleMerging() {
        console.log('🔗 测试模块合并功能...');
        
        try {
            const ModuleMerger = require(path.join(this.projectRoot, 'build', 'ModuleMerger.js'));
            const merger = new ModuleMerger();
            
            // 测试基本合并功能
            const testModules = [
                {
                    path: path.join(this.tempDir, 'testA.js'),
                    content: 'export class TestA { constructor() { console.log("A"); } }'
                },
                {
                    path: path.join(this.tempDir, 'testB.js'),
                    content: 'export class TestB { constructor() { console.log("B"); } }'
                }
            ];
            
            testModules.forEach(module => {
                fs.writeFileSync(module.path, module.content);
            });
            
            const mergedContent = merger.merge(testModules.map(m => m.path));
            
            if (mergedContent && mergedContent.includes('TestA') && mergedContent.includes('TestB')) {
                this.addResult('Module Merging', 'Basic Merging', 'PASSED', '模块合并功能正常');
            } else {
                this.addResult('Module Merging', 'Basic Merging', 'FAILED', '模块合并失败');
            }
            
        } catch (error) {
            this.addResult('Module Merging', 'Basic Merging', 'FAILED', error.message);
        }
        
        console.log('✅ 模块合并功能测试完成\n');
    }

    async testBuildOutput() {
        console.log('📦 测试构建产物生成...');
        
        try {
            // 运行构建命令
            const buildCommand = 'npm run build';
            console.log(`执行构建命令: ${buildCommand}`);
            
            const output = execSync(buildCommand, { 
                cwd: this.projectRoot,
                encoding: 'utf8',
                timeout: 30000
            });
            
            this.addResult('Build Output', 'Build Command', 'PASSED', '构建命令执行成功');
            
            // 检查构建产物
            const distPath = path.join(this.projectRoot, 'dist', 'scrollbar-control.user.js');
            if (fs.existsSync(distPath)) {
                const stats = fs.statSync(distPath);
                if (stats.size > 0) {
                    this.addResult('Build Output', 'Output File', 'PASSED', `构建产物生成成功，大小: ${stats.size} bytes`);
                } else {
                    this.addResult('Build Output', 'Output File', 'FAILED', '构建产物为空');
                }
            } else {
                this.addResult('Build Output', 'Output File', 'FAILED', '构建产物不存在');
            }
            
            // 验证构建产物内容
            if (fs.existsSync(distPath)) {
                const content = fs.readFileSync(distPath, 'utf8');
                
                // 检查油猴脚本头部
                if (content.includes('// ==UserScript==') && content.includes('// ==/UserScript==')) {
                    this.addResult('Build Output', 'UserScript Header', 'PASSED', '油猴脚本头部正确');
                } else {
                    this.addResult('Build Output', 'UserScript Header', 'FAILED', '油猴脚本头部缺失');
                }
                
                // 检查构建日期
                if (content.includes('@buildDate')) {
                    this.addResult('Build Output', 'Build Date', 'PASSED', '构建日期已添加');
                } else {
                    this.addResult('Build Output', 'Build Date', 'FAILED', '构建日期缺失');
                }
                
                // 检查模块系统
                if (content.includes('__modules') && content.includes('__require')) {
                    this.addResult('Build Output', 'Module System', 'PASSED', '模块系统正确集成');
                } else {
                    this.addResult('Build Output', 'Module System', 'FAILED', '模块系统集成失败');
                }
            }
            
        } catch (error) {
            this.addResult('Build Output', 'Build Process', 'FAILED', error.message);
        }
        
        console.log('✅ 构建产物生成测试完成\n');
    }

    async testDevModeBuild() {
        console.log('🛠️  测试开发模式构建...');
        
        try {
            // 运行开发模式构建
            const devBuildCommand = 'npm run build:dev';
            console.log(`执行开发构建命令: ${devBuildCommand}`);
            
            const output = execSync(devBuildCommand, { 
                cwd: this.projectRoot,
                encoding: 'utf8',
                timeout: 30000
            });
            
            this.addResult('Dev Build', 'Dev Command', 'PASSED', '开发模式构建命令执行成功');
            
            // 检查开发模式构建产物
            const devDistPath = path.join(this.projectRoot, 'dist', 'scrollbar-control.user.js');
            if (fs.existsSync(devDistPath)) {
                const content = fs.readFileSync(devDistPath, 'utf8');
                
                // 开发模式应该包含更多调试信息
                if (content.includes('development') || content.includes('debug')) {
                    this.addResult('Dev Build', 'Debug Info', 'PASSED', '开发模式包含调试信息');
                } else {
                    this.addResult('Dev Build', 'Debug Info', 'WARNING', '开发模式可能缺少调试信息');
                }
            }
            
        } catch (error) {
            // 如果没有开发模式构建命令，这不是错误
            if (error.message.includes('missing script')) {
                this.addResult('Dev Build', 'Dev Command', 'WARNING', '开发模式构建命令不存在');
            } else {
                this.addResult('Dev Build', 'Dev Command', 'FAILED', error.message);
            }
        }
        
        console.log('✅ 开发模式构建测试完成\n');
    }

    async testBuildCommands() {
        console.log('⚙️  测试构建脚本命令...');
        
        try {
            // 读取package.json检查脚本命令
            const packageJsonPath = path.join(this.projectRoot, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                const scripts = packageJson.scripts || {};
                
                // 检查必要的构建命令
                const requiredScripts = ['build'];
                const optionalScripts = ['build:dev', 'build:watch', 'clean'];
                
                for (const script of requiredScripts) {
                    if (scripts[script]) {
                        this.addResult('Build Commands', `Script ${script}`, 'PASSED', `${script}命令存在`);
                    } else {
                        this.addResult('Build Commands', `Script ${script}`, 'FAILED', `${script}命令缺失`);
                    }
                }
                
                for (const script of optionalScripts) {
                    if (scripts[script]) {
                        this.addResult('Build Commands', `Script ${script}`, 'PASSED', `${script}命令存在`);
                    } else {
                        this.addResult('Build Commands', `Script ${script}`, 'WARNING', `${script}命令不存在（可选）`);
                    }
                }
            } else {
                this.addResult('Build Commands', 'Package.json', 'FAILED', 'package.json不存在');
            }
            
        } catch (error) {
            this.addResult('Build Commands', 'Script Check', 'FAILED', error.message);
        }
        
        console.log('✅ 构建脚本命令测试完成\n');
    }

    async cleanupTestEnvironment() {
        console.log('🧹 清理测试环境...');
        
        try {
            if (fs.existsSync(this.tempDir)) {
                fs.rmSync(this.tempDir, { recursive: true, force: true });
            }
            this.addResult('Environment', 'Cleanup', 'PASSED', '测试环境清理完成');
        } catch (error) {
            this.addResult('Environment', 'Cleanup', 'WARNING', `清理失败: ${error.message}`);
        }
        
        console.log('✅ 测试环境清理完成\n');
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
        console.log('📊 生成构建系统测试报告...\n');
        
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;
        const warnings = this.testResults.filter(r => r.status === 'WARNING').length;
        const total = this.testResults.length;
        
        console.log('='.repeat(60));
        console.log('🔨 构建系统测试报告');
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
            console.log('❌ 构建系统测试失败，请检查上述问题');
            process.exit(1);
        } else {
            console.log('🎉 构建系统测试通过！');
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
        
        const reportPath = path.join(__dirname, 'build-system-test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 详细报告已保存到: ${reportPath}`);
    }
}

// 运行测试
if (require.main === module) {
    const tester = new BuildSystemTester();
    tester.run().catch(error => {
        console.error('构建系统测试运行器错误:', error);
        process.exit(1);
    });
}

module.exports = BuildSystemTester;
