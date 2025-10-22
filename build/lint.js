#!/usr/bin/env node

/**
 * ESLint runner script
 * Provides a reliable way to run ESLint in CI environments
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function findESLint() {
    // Try different ESLint paths in order of preference
    const eslintPaths = [
        // Direct path to eslint.js
        path.join(__dirname, '..', 'node_modules', 'eslint', 'bin', 'eslint.js'),
        // npm bin path
        path.join(__dirname, '..', 'node_modules', '.bin', 'eslint'),
        // Alternative npm bin path
        path.join(__dirname, '..', 'node_modules', '.bin', 'eslint.cmd')
    ];

    for (const eslintPath of eslintPaths) {
        if (fs.existsSync(eslintPath)) {
            console.log(`✅ Found ESLint at: ${eslintPath}`);
            return eslintPath;
        }
    }

    // Try to use npx as fallback
    try {
        execSync('npx eslint --version', { stdio: 'pipe' });
        console.log('✅ Using npx eslint');
        return 'npx eslint';
    } catch (error) {
        // npx not available
    }

    // Last resort: try global eslint
    try {
        execSync('eslint --version', { stdio: 'pipe' });
        console.log('✅ Using global eslint');
        return 'eslint';
    } catch (error) {
        // eslint not found globally
    }

    throw new Error('ESLint not found. Please ensure it is installed.');
}

function runESLint(eslintCommand, args) {
    const projectRoot = path.join(__dirname, '..');

    let command;
    if (eslintCommand.endsWith('.js')) {
        command = `node "${eslintCommand}" ${args.join(' ')}`;
    } else {
        command = `${eslintCommand} ${args.join(' ')}`;
    }

    console.log(`Running: ${command}`);
    console.log(`Working directory: ${projectRoot}`);

    try {
        execSync(command, {
            stdio: 'inherit',
            cwd: projectRoot
        });
        console.log('✅ ESLint completed successfully');
        return true;
    } catch (error) {
        console.error(`❌ ESLint failed with exit code ${error.status}`);
        return false;
    }
}

function main() {
    const args = process.argv.slice(2);

    // Default arguments if none provided
    if (args.length === 0) {
        args.push('src/', 'build/');
    }

    console.log('🔍 Running ESLint...');
    console.log(`Arguments: ${args.join(' ')}`);

    try {
        const eslintCommand = findESLint();
        const success = runESLint(eslintCommand, args);

        if (success) {
            process.exit(0);
        } else {
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ ESLint execution failed:', error.message);

        // Provide helpful debugging information
        console.log('\n🔍 Debugging information:');
        console.log('Node modules directory contents:');
        try {
            const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
            if (fs.existsSync(nodeModulesPath)) {
                const contents = fs.readdirSync(nodeModulesPath);
                console.log('Available packages:', contents.filter(name => !name.startsWith('.')).slice(0, 10).join(', '));

                const eslintDir = path.join(nodeModulesPath, 'eslint');
                if (fs.existsSync(eslintDir)) {
                    console.log('ESLint directory exists');
                    const eslintBinDir = path.join(eslintDir, 'bin');
                    if (fs.existsSync(eslintBinDir)) {
                        const binContents = fs.readdirSync(eslintBinDir);
                        console.log('ESLint bin contents:', binContents.join(', '));
                    }
                } else {
                    console.log('❌ ESLint directory not found');
                }
            } else {
                console.log('❌ node_modules directory not found');
            }
        } catch (debugError) {
            console.log('Could not read node_modules directory');
        }

        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { findESLint, runESLint };
