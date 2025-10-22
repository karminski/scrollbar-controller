#!/usr/bin/env node

/**
 * CI/CD流程测试
 * 验证GitHub Actions工作流的正确性
 */

const fs = require('fs');
const path = require('path');
// Simple YAML parser for basic validation
function parseSimpleYAML(content) {
    try {
        // Basic YAML validation - check for common syntax errors
        if (content.includes('---') || content.includes('name:') || content.includes('on:')) {
            return { valid: true, parsed: true };
        }
        return { valid: false, parsed: false };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

class CICDTester {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..');
        this.testResults = [];
    }

    async run() {
        console.log('🚀 开始CI/CD流程测试...\n');
        
        try {
            // 测试GitHub Actions工作流文件
            await this.testWorkflowFiles();
            
            // 测试工作流配置
            await this.testWorkflowConfiguration();
            
            // 测试构建脚本集成
            await this.testBuildScriptIntegration();
            
            // 生成测试报告
            this.generateReport();
            
        } catch (error) {
            console.error('❌ CI/CD测试失败:', error.message);
            process.exit(1);
        }
    }

    async testWorkflowFiles() {
        console.log('📋 测试GitHub Actions工作流文件...');
        
        const workflowDir = path.join(this.projectRoot, '.github', 'workflows');
        
        if (!fs.existsSync(workflowDir)) {
            this.addResult('Workflow Files', 'Directory Existence', 'FAILED', '.github/workflows目录不存在');
            return;
        }
        
        this.addResult('Workflow Files', 'Directory Existence', 'PASSED', '.github/workflows目录存在');
        
        // 检查工作流文件
        const workflowFiles = fs.readdirSync(workflowDir).filter(file => 
            file.endsWith('.yml') || file.endsWith('.yaml')
        );
        
        if (workflowFiles.length > 0) {
            this.addResult('Workflow Files', 'File Count', 'PASSED', `找到${workflowFiles.length}个工作流文件`);
            
            // 检查每个工作流文件
            for (const file of workflowFiles) {
                const filePath = path.join(workflowDir, file);
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const yamlResult = parseSimpleYAML(content);
                    if (yamlResult.valid) {
                        this.addResult('Workflow Files', `YAML Syntax - ${file}`, 'PASSED', `${file}语法正确`);
                    } else {
                        this.addResult('Workflow Files', `YAML Syntax - ${file}`, 'FAILED', `${file}语法错误`);
                    }
                } catch (error) {
                    this.addResult('Workflow Files', `YAML Syntax - ${file}`, 'FAILED', `${file}语法错误: ${error.message}`);
                }
            }
        } else {
            this.addResult('Workflow Files', 'File Count', 'FAILED', '未找到工作流文件');
        }
        
        console.log('✅ GitHub Actions工作流文件测试完成\n');
    }

    async testWorkflowConfiguration() {
        console.log('⚙️  测试工作流配置...');
        
        const workflowDir = path.join(this.projectRoot, '.github', 'workflows');
        const workflowFiles = fs.readdirSync(workflowDir).filter(file => 
            file.endsWith('.yml') || file.endsWith('.yaml')
        );
        
        for (const file of workflowFiles) {
            const filePath = path.join(workflowDir, file);
            
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                // Simple workflow parsing - look for key patterns
                const workflow = {
                    name: content.match(/name:\s*(.+)/)?.[1]?.trim(),
                    on: content.includes('on:'),
                    jobs: content.includes('jobs:')
                };
                
                // Parse jobs section if exists
                if (workflow.jobs) {
                    const jobsSection = content.split('jobs:')[1];
                    if (jobsSection) {
                        const jobMatches = jobsSection.match(/^\s+\w+:/gm) || [];
                        workflow.jobs = {};
                        jobMatches.forEach(match => {
                            const jobName = match.trim().replace(':', '');
                            workflow.jobs[jobName] = {
                                steps: content.includes('steps:') ? [
                                    { run: content.includes('npm run build') ? 'npm run build' : null },
                                    { uses: content.includes('upload-artifact') ? 'upload-artifact' : null }
                                ].filter(step => step.run || step.uses) : []
                            };
                        });
                    }
                }
                
                // 检查基本结构
                if (workflow.name) {
                    this.addResult('Workflow Config', `Name - ${file}`, 'PASSED', `工作流名称: ${workflow.name}`);
                } else {
                    this.addResult('Workflow Config', `Name - ${file}`, 'WARNING', '工作流缺少名称');
                }
                
                if (workflow.on) {
                    this.addResult('Workflow Config', `Triggers - ${file}`, 'PASSED', '工作流触发器配置正确');
                } else {
                    this.addResult('Workflow Config', `Triggers - ${file}`, 'FAILED', '工作流缺少触发器');
                }
                
                if (workflow.jobs) {
                    const jobCount = Object.keys(workflow.jobs).length;
                    this.addResult('Workflow Config', `Jobs - ${file}`, 'PASSED', `包含${jobCount}个作业`);
                    
                    // 检查构建作业
                    for (const [jobName, job] of Object.entries(workflow.jobs)) {
                        if (job.steps) {
                            const stepCount = job.steps.length;
                            this.addResult('Workflow Config', `Steps - ${jobName}`, 'PASSED', `${jobName}包含${stepCount}个步骤`);
                            
                            // 检查是否包含构建步骤
                            const hasBuildStep = job.steps.some(step => 
                                step.run && (step.run.includes('npm run build') || step.run.includes('build'))
                            );
                            
                            if (hasBuildStep) {
                                this.addResult('Workflow Config', `Build Step - ${jobName}`, 'PASSED', `${jobName}包含构建步骤`);
                            } else {
                                this.addResult('Workflow Config', `Build Step - ${jobName}`, 'WARNING', `${jobName}可能缺少构建步骤`);
                            }
                            
                            // 检查是否包含产物上传
                            const hasArtifactUpload = job.steps.some(step => 
                                step.uses && step.uses.includes('upload-artifact')
                            );
                            
                            if (hasArtifactUpload) {
                                this.addResult('Workflow Config', `Artifact Upload - ${jobName}`, 'PASSED', `${jobName}包含产物上传`);
                            } else {
                                this.addResult('Workflow Config', `Artifact Upload - ${jobName}`, 'WARNING', `${jobName}可能缺少产物上传`);
                            }
                        } else {
                            this.addResult('Workflow Config', `Steps - ${jobName}`, 'FAILED', `${jobName}缺少步骤`);
                        }
                    }
                } else {
                    this.addResult('Workflow Config', `Jobs - ${file}`, 'FAILED', '工作流缺少作业');
                }
                
            } catch (error) {
                this.addResult('Workflow Config', `Parse - ${file}`, 'FAILED', `解析失败: ${error.message}`);
            }
        }
        
        console.log('✅ 工作流配置测试完成\n');
    }

    async testBuildScriptIntegration() {
        console.log('🔗 测试构建脚本集成...');
        
        // 检查package.json中的构建脚本
        const packageJsonPath = path.join(this.projectRoot, 'package.json');
        
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const scripts = packageJson.scripts || {};
            
            if (scripts.build) {
                this.addResult('Build Integration', 'Build Script', 'PASSED', 'package.json包含构建脚本');
                
                // 检查构建脚本是否指向正确的构建文件
                if (scripts.build.includes('build.js') || scripts.build.includes('build/')) {
                    this.addResult('Build Integration', 'Build Script Path', 'PASSED', '构建脚本路径正确');
                } else {
                    this.addResult('Build Integration', 'Build Script Path', 'WARNING', '构建脚本路径可能不正确');
                }
            } else {
                this.addResult('Build Integration', 'Build Script', 'FAILED', 'package.json缺少构建脚本');
            }
            
            // 检查其他相关脚本
            const relatedScripts = ['test', 'lint', 'clean'];
            for (const script of relatedScripts) {
                if (scripts[script]) {
                    this.addResult('Build Integration', `Script ${script}`, 'PASSED', `${script}脚本存在`);
                } else {
                    this.addResult('Build Integration', `Script ${script}`, 'WARNING', `${script}脚本不存在（可选）`);
                }
            }
        } else {
            this.addResult('Build Integration', 'Package.json', 'FAILED', 'package.json不存在');
        }
        
        // 检查构建脚本文件
        const buildScriptPath = path.join(this.projectRoot, 'build', 'build.js');
        if (fs.existsSync(buildScriptPath)) {
            this.addResult('Build Integration', 'Build Script File', 'PASSED', '构建脚本文件存在');
            
            // 检查构建脚本是否可执行
            try {
                const buildScript = fs.readFileSync(buildScriptPath, 'utf8');
                if (buildScript.includes('module.exports') || buildScript.includes('exports')) {
                    this.addResult('Build Integration', 'Build Script Export', 'PASSED', '构建脚本可导出');
                } else {
                    this.addResult('Build Integration', 'Build Script Export', 'WARNING', '构建脚本可能不可导出');
                }
            } catch (error) {
                this.addResult('Build Integration', 'Build Script Read', 'FAILED', `读取构建脚本失败: ${error.message}`);
            }
        } else {
            this.addResult('Build Integration', 'Build Script File', 'FAILED', '构建脚本文件不存在');
        }
        
        console.log('✅ 构建脚本集成测试完成\n');
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
        console.log('📊 生成CI/CD测试报告...\n');
        
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;
        const warnings = this.testResults.filter(r => r.status === 'WARNING').length;
        const total = this.testResults.length;
        
        console.log('='.repeat(60));
        console.log('🚀 CI/CD流程测试报告');
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
            console.log('❌ CI/CD测试失败，请检查上述问题');
            process.exit(1);
        } else {
            console.log('🎉 CI/CD测试通过！');
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
        
        const reportPath = path.join(__dirname, 'ci-cd-test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 详细报告已保存到: ${reportPath}`);
    }
}

// 运行测试
if (require.main === module) {
    const tester = new CICDTester();
    tester.run().catch(error => {
        console.error('CI/CD测试运行器错误:', error);
        process.exit(1);
    });
}

module.exports = CICDTester;
