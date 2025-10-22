#!/usr/bin/env node

/**
 * Clean script - removes build artifacts
 * Cross-platform alternative to rimraf
 */

const fs = require('fs');
const path = require('path');

function removeDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        return;
    }

    try {
        const files = fs.readdirSync(dirPath);

        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                removeDirectory(filePath);
            } else {
                fs.unlinkSync(filePath);
            }
        }

        fs.rmdirSync(dirPath);
        console.log(`✅ Removed directory: ${dirPath}`);
    } catch (error) {
        console.warn(`⚠️  Warning: Could not remove ${dirPath}: ${error.message}`);
    }
}

function main() {
    console.log('🧹 Cleaning build artifacts...');

    const projectRoot = path.join(__dirname, '..');
    const dirsToClean = ['dist', 'coverage'];

    for (const dir of dirsToClean) {
        const dirPath = path.join(projectRoot, dir);
        removeDirectory(dirPath);
    }

    console.log('✅ Clean completed');
}

if (require.main === module) {
    main();
}

module.exports = { main, removeDirectory };
