#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { processArtifacts } from './index.js';
import type { AppConfig } from './types.js';

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

program
  .name('action-to-qiniu')
  .description('Upload GitHub Action artifacts to Qiniu CDN')
  .version('1.0.0');

program
  .option('-c, --config <path>', 'Path to configuration file', 'config.json')
  .option('-v, --verbose', 'Enable verbose logging (default: true)', true)
  .option('--no-verbose', 'Disable verbose logging');

program.parse(process.argv);

const options = program.opts();

async function main(): Promise<void> {
  try {
    const configPath = path.resolve(options.config);
    
    if (!await fs.pathExists(configPath)) {
      console.error(chalk.red(`Error: Configuration file not found: ${configPath}`));
      console.error(chalk.yellow('Create a config.json file or specify a different path with -c'));
      process.exit(1);
    }

    const config = await fs.readJson(configPath) as AppConfig;
    
    // Initialize options if not present
    config.options = config.options || {};
    
    // Set verbose mode: CLI option overrides config, default is true
    if (options.verbose !== undefined) {
      config.options.verbose = options.verbose;
    } else if (config.options.verbose === undefined) {
      config.options.verbose = true;
    }

    if (config.options?.verbose) {
      console.log(chalk.blue('🔧 Loading configuration from:', configPath));
      console.log(chalk.gray('───────────────────────────────────────────────'));
    }

    const result = await processArtifacts(config);
    
    console.log(chalk.green('\n🎉 Process completed successfully!'));
    console.log(chalk.gray('═══════════════════════════════════════════════'));
    
    if (result.downloaded) {
      console.log(chalk.cyan(`📥 DOWNLOAD SUMMARY`));
      console.log(chalk.cyan(`   Artifacts: ${result.downloaded.count}`));
      console.log(chalk.cyan(`   Location: ${result.downloaded.downloadDir}`));
      
      if (result.downloaded.files && result.downloaded.files.length > 0) {
        console.log(chalk.cyan('\n   Downloaded artifacts:'));
        result.downloaded.files.forEach((file, index) => {
          const dateInfo = file.createdAt ? ` (${new Date(file.createdAt).toLocaleDateString()})` : '';
          console.log(chalk.cyan(`     ${index + 1}. ${file.name}${dateInfo}`));
          console.log(chalk.gray(`       → ${file.path}`));
        });
      }
      console.log(chalk.gray('───────────────────────────────────────────────'));
    }
    
    console.log(chalk.magenta(`📤 UPLOAD SUMMARY`));
    console.log(chalk.magenta(`   Total files: ${result.uploaded.totalCount}`));
    console.log(chalk.green(`   ✅ Successful: ${result.uploaded.successCount}`));
    
    if (result.uploaded.failedCount > 0) {
      console.log(chalk.red(`   ❌ Failed: ${result.uploaded.failedCount}`));
    } else {
      console.log(chalk.green('   ❌ Failed: 0'));
    }
    
    if (result.uploaded.files && result.uploaded.files.length > 0) {
      console.log(chalk.magenta('\n   Uploaded files:'));
      result.uploaded.files.forEach((file, index) => {
        console.log(chalk.magenta(`     ${index + 1}. ${file.local}`));
        console.log(chalk.gray(`       → ${file.remote} (${formatBytes(file.size)})`));
      });
    }
    
    if (result.uploaded.failedFiles && result.uploaded.failedFiles.length > 0) {
      console.log(chalk.red('\n   Failed files:'));
      result.uploaded.failedFiles.forEach((file, index) => {
        console.log(chalk.red(`     ${index + 1}. ${file.local}`));
        console.log(chalk.gray(`       → Error: ${file.error}`));
      });
    }
    
    console.log(chalk.gray('═══════════════════════════════════════════════'));
    console.log(chalk.green('✅ All operations completed!'));

  } catch (error) {
    console.error(chalk.red(`\n❌ Error: ${(error as Error).message}`));
    if ((error as Error).stack && options.verbose) {
      console.error(chalk.red((error as Error).stack));
    }
    process.exit(1);
  }
}

main();