#!/usr/bin/env node

/**
 * Local CI/CD Testing Script
 * Simulates the GitHub Actions workflow steps locally for testing
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
    log(`\n🔄 ${description}...`, 'blue');
    try {
        const output = execSync(command, { 
            encoding: 'utf8', 
            stdio: 'pipe',
            cwd: path.join(__dirname, '..')
        });
        log(`✅ ${description} completed`, 'green');
        return { success: true, output };
    } catch (error) {
        log(`❌ ${description} failed: ${error.message}`, 'red');
        return { success: false, error: error.message };
    }
}

function checkFile(filePath, description) {
    const fullPath = path.join(__dirname, '..', filePath);
    if (fs.existsSync(fullPath)) {
        log(`✅ ${description}: ${filePath}`, 'green');
        return true;
    } else {
        log(`❌ ${description}: ${filePath} not found`, 'red');
        return false;
    }
}

function main() {
    log('🚀 Starting Local CI/CD Test', 'cyan');
    log('=====================================', 'cyan');
    
    const results = {
        passed: 0,
        failed: 0,
        steps: []
    };
    
    // Step 1: Validate project structure
    log('\n📁 Step 1: Validating project structure', 'magenta');
    const criticalFiles = [
        'package.json',
        'src/main.js',
        'build/build.js',
        '.github/workflows/build.yml'
    ];
    
    let structureValid = true;
    criticalFiles.forEach(file => {
        if (!checkFile(file, 'Critical file')) {
            structureValid = false;
        }
    });
    
    if (structureValid) {
        results.passed++;
        results.steps.push({ name: 'Project Structure', status: 'passed' });
    } else {
        results.failed++;
        results.steps.push({ name: 'Project Structure', status: 'failed' });
    }
    
    // Step 2: Install dependencies
    log('\n📦 Step 2: Installing dependencies', 'magenta');
    const installResult = runCommand('npm ci --prefer-offline --no-audit', 'Dependency installation');
    if (installResult.success) {
        results.passed++;
        results.steps.push({ name: 'Dependencies', status: 'passed' });
    } else {
        results.failed++;
        results.steps.push({ name: 'Dependencies', status: 'failed' });
    }
    
    // Step 3: Lint code
    log('\n🔍 Step 3: Linting code', 'magenta');
    const lintResult = runCommand('npm run lint', 'Code linting');
    if (lintResult.success) {
        results.passed++;
        results.steps.push({ name: 'Linting', status: 'passed' });
    } else {
        results.failed++;
        results.steps.push({ name: 'Linting', status: 'failed' });
    }
    
    // Step 4: Check formatting
    log('\n🎨 Step 4: Checking code formatting', 'magenta');
    const formatResult = runCommand('npm run format:check', 'Code formatting check');
    if (formatResult.success) {
        results.passed++;
        results.steps.push({ name: 'Formatting', status: 'passed' });
    } else {
        results.failed++;
        results.steps.push({ name: 'Formatting', status: 'failed' });
    }
    
    // Step 5: Run tests
    log('\n🧪 Step 5: Running tests', 'magenta');
    const testResult = runCommand('npm test', 'Tests');
    if (testResult.success) {
        results.passed++;
        results.steps.push({ name: 'Tests', status: 'passed' });
    } else {
        results.failed++;
        results.steps.push({ name: 'Tests', status: 'failed' });
    }
    
    // Step 6: Clean and build
    log('\n🔨 Step 6: Building project', 'magenta');
    const cleanResult = runCommand('npm run clean', 'Clean');
    const buildResult = runCommand('npm run build', 'Build');
    
    if (cleanResult.success && buildResult.success) {
        // Validate build output
        if (checkFile('dist/scrollbar-control.user.js', 'Build output')) {
            const filePath = path.join(__dirname, '..', 'dist/scrollbar-control.user.js');
            const stats = fs.statSync(filePath);
            const content = fs.readFileSync(filePath, 'utf8');
            
            log(`📊 Build statistics:`, 'blue');
            log(`   File size: ${stats.size} bytes`, 'blue');
            log(`   Lines: ${content.split('\n').length}`, 'blue');
            
            // Check for userscript header
            if (content.includes('// ==UserScript==')) {
                log(`✅ Userscript header found`, 'green');
                results.passed++;
                results.steps.push({ name: 'Build', status: 'passed' });
            } else {
                log(`❌ Userscript header missing`, 'red');
                results.failed++;
                results.steps.push({ name: 'Build', status: 'failed' });
            }
        } else {
            results.failed++;
            results.steps.push({ name: 'Build', status: 'failed' });
        }
    } else {
        results.failed++;
        results.steps.push({ name: 'Build', status: 'failed' });
    }
    
    // Final summary
    log('\n📋 Test Summary', 'cyan');
    log('=====================================', 'cyan');
    
    results.steps.forEach(step => {
        const icon = step.status === 'passed' ? '✅' : '❌';
        const color = step.status === 'passed' ? 'green' : 'red';
        log(`${icon} ${step.name}`, color);
    });
    
    log(`\n📊 Results: ${results.passed} passed, ${results.failed} failed`, 
         results.failed === 0 ? 'green' : 'red');
    
    if (results.failed === 0) {
        log('\n🎉 All tests passed! Your code is ready for CI/CD.', 'green');
        process.exit(0);
    } else {
        log('\n❌ Some tests failed. Please fix the issues before pushing.', 'red');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { main };
