#!/usr/bin/env node

/**
 * Basic Test Suite
 * Simple tests to validate core functionality
 */

const fs = require('fs');
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function runTest(testName, testFn) {
    try {
        const result = testFn();
        if (result) {
            log(`✅ ${testName}`, 'green');
            return true;
        } else {
            log(`❌ ${testName}`, 'red');
            return false;
        }
    } catch (error) {
        log(`❌ ${testName}: ${error.message}`, 'red');
        return false;
    }
}

function main() {
    log('🧪 Running Basic Tests', 'blue');
    log('====================', 'blue');

    let passed = 0;
    let total = 0;

    // Test 1: Check if main source file exists
    total++;
    if (runTest('Main source file exists', () => {
        return fs.existsSync(path.join(__dirname, '..', 'src', 'main.js'));
    })) {
        passed++;
    }

    // Test 2: Check if build script exists
    total++;
    if (runTest('Build script exists', () => {
        return fs.existsSync(path.join(__dirname, '..', 'build', 'build.js'));
    })) {
        passed++;
    }

    // Test 3: Check if package.json is valid
    total++;
    if (runTest('Package.json is valid', () => {
        const packagePath = path.join(__dirname, '..', 'package.json');
        if (!fs.existsSync(packagePath)) return false;
        
        const packageContent = fs.readFileSync(packagePath, 'utf8');
        const packageJson = JSON.parse(packageContent);
        
        return packageJson.name && packageJson.version && packageJson.scripts;
    })) {
        passed++;
    }

    // Test 4: Check if dist directory can be created
    total++;
    if (runTest('Dist directory can be created', () => {
        const distPath = path.join(__dirname, '..', 'dist');
        if (!fs.existsSync(distPath)) {
            fs.mkdirSync(distPath, { recursive: true });
        }
        return fs.existsSync(distPath);
    })) {
        passed++;
    }

    // Test 5: Check if built file exists (if build was run)
    total++;
    if (runTest('Built userscript exists (if built)', () => {
        const builtFile = path.join(__dirname, '..', 'dist', 'scrollbar-control.user.js');
        // This test passes if the file doesn't exist (build not run) or if it exists and is valid
        if (!fs.existsSync(builtFile)) {
            log('  ℹ️  Built file not found (build not run yet)', 'yellow');
            return true; // Pass if not built yet
        }
        
        const content = fs.readFileSync(builtFile, 'utf8');
        return content.includes('// ==UserScript==') && content.length > 1000;
    })) {
        passed++;
    }

    // Summary
    log('\n📊 Test Results', 'blue');
    log('===============', 'blue');
    log(`Passed: ${passed}/${total}`, passed === total ? 'green' : 'red');

    if (passed === total) {
        log('\n🎉 All tests passed!', 'green');
        process.exit(0);
    } else {
        log('\n❌ Some tests failed!', 'red');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { main };
