#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const { processArtifacts } = require('./index');

program
  .name('action-to-qiniu')
  .description('Upload GitHub Action artifacts to Qiniu CDN')
  .version('1.0.0');

program
  .option('-c, --config <path>', 'Path to configuration file', 'config.json')
  .option('-v, --verbose', 'Enable verbose logging');

program.parse(process.argv);

const options = program.opts();

async function main() {
  try {
    const configPath = path.resolve(options.config);
    
    if (!await fs.pathExists(configPath)) {
      console.error(chalk.red(`Error: Configuration file not found: ${configPath}`));
      console.error(chalk.yellow('Create a config.json file or specify a different path with -c'));
      process.exit(1);
    }

    const config = await fs.readJson(configPath);
    
    // Override verbose setting if specified via CLI
    if (options.verbose !== undefined) {
      config.options = config.options || {};
      config.options.verbose = options.verbose;
    }

    if (config.options?.verbose) {
      console.log(chalk.blue('Loading configuration from:', configPath));
    }

    const result = await processArtifacts(config);
    
    console.log(chalk.green(`\n✅ Process completed!`));
    
    if (result.downloaded) {
      console.log(chalk.blue(`📥 Downloaded: ${result.downloaded.count} artifacts`));
      if (result.downloaded.files) {
        result.downloaded.files.forEach(file => {
          console.log(chalk.blue(`   ${file.name} -> ${file.path}`));
        });
      }
    }
    
    console.log(chalk.blue(`📤 Uploaded: ${result.uploaded.successCount}/${result.uploaded.totalCount} files`));
    
    if (result.uploaded.failedCount > 0) {
      console.log(chalk.yellow(`⚠️  Failed: ${result.uploaded.failedCount} files`));
    }
    
    if (result.uploaded.files && result.uploaded.files.length > 0) {
      console.log(chalk.blue('\n📦 Uploaded files:'));
      result.uploaded.files.forEach(file => {
        console.log(chalk.blue(`   ${file.local} -> ${file.remote}`));
      });
    }

  } catch (error) {
    console.error(chalk.red(`\n❌ Error: ${error.message}`));
    if (error.stack && options.verbose) {
      console.error(chalk.red(error.stack));
    }
    process.exit(1);
  }
}

main();