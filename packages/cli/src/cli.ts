#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { downloadCommand } from './commands/download';
import { modelsCommand } from './commands/models';
import { testCommand } from './commands/test';
import { hardwareCommand } from './commands/hardware';
import { benchmarkCommand } from './commands/benchmark';

const program = new Command();

program
  .name('idgaf')
  .description('IDGAF.ai CLI - Model management and testing utilities')
  .version('0.1.0');

// Global options
program
  .option('-v, --verbose', 'verbose output')
  .option('--config <path>', 'config file path', './.idgafrc')
  .option('--cache <path>', 'model cache path', './models');

// Commands
program
  .command('download')
  .description('Download a model from URL')
  .argument('<url>', 'model URL')
  .option('-o, --output <path>', 'output path')
  .option('--no-verify', 'skip checksum verification')
  .action(downloadCommand);

program
  .addCommand(modelsCommand);

program
  .command('test')
  .description('Test model inference')
  .argument('<model>', 'model path')
  .option('-p, --prompt <text>', 'test prompt', 'Hello world')
  .option('-n, --max-tokens <number>', 'maximum tokens', '50')
  .option('-t, --temperature <number>', 'sampling temperature', '0.7')
  .action(testCommand);

program
  .addCommand(hardwareCommand);

program
  .command('benchmark')
  .description('Run performance benchmark')
  .argument('<model>', 'model path')
  .option('-r, --runs <number>', 'number of runs', '5')
  .option('--warmup <number>', 'warmup runs', '2')
  .action(benchmarkCommand);

// Error handling
program.configureOutput({
  writeErr: (str) => process.stderr.write(chalk.red(str)),
});

program.on('command:*', () => {
  console.error(chalk.red('Invalid command: %s'), program.args.join(' '));
  console.log(chalk.yellow('See --help for a list of available commands.'));
  process.exit(1);
});

// Parse and execute
if (require.main === module) {
  program.parse();
}

export { program };