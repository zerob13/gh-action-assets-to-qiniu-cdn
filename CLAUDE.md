# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript CLI tool for uploading GitHub Action artifacts to Qiniu CDN, designed to run with Bun. It provides flexible file mapping, post-processing, and multiple configuration options with full type safety.

## Project Structure

```
├── src/
│   ├── index.js          # Core upload functionality
│   └── cli.js           # CLI interface and argument parsing
├── test/                # Test files (to be implemented)
├── .env.example         # Example environment configuration
├── .gitignore          # Git ignore patterns
├── package.json         # Project dependencies and scripts
├── README.md           # Comprehensive documentation
└── LICENSE             # MIT License
```

## Key Components

1. **CLI Interface** (`src/cli.js`): Command-line argument parsing using Commander
2. **Core Logic** (`src/index.js`): Qiniu SDK integration and file processing
3. **Configuration**: Support for CLI args, environment variables, and .env files
4. **File Processing**: Glob pattern matching and path mapping
5. **Post-processing**: Script execution before upload

## Development Commands

```bash
# Install dependencies with Bun
bun install

# Build TypeScript to JavaScript
bun run build

# Run with example config (development mode)
bun run dev

# Run with custom config
bun run src/cli.ts -c config.example.json -v

# Run tests (when implemented)
bun test

# Start the built version
bun run start

# Lint code
bun run lint

# Clean build artifacts
bun run clean

# Install globally for CLI usage
bun install -g .
```

## Configuration System

The tool supports multiple configuration sources (in order of priority):
1. CLI arguments (highest priority)
2. Environment variables
3. .env file values
4. Default values

### Verbose Mode
- **Default**: Verbose mode is enabled by default for better user experience
- **Disable**: Use `--no-verbose` flag to disable verbose output
- **Override**: CLI options take precedence over config file settings

## Qiniu Integration

- Uses the official Qiniu Node.js SDK
- Supports all Qiniu zones (z0, z1, z2, na0, as0)
- Proper error handling for upload failures
- Configurable overwrite behavior

## Security Considerations

- Credentials are never logged
- .env files are gitignored by default
- Environment variables are recommended for production
- Secret management best practices are documented

## Enhanced Features

### Progress Indicators & Rich Output
- **Download Progress**: Real-time progress bars showing download percentage and file sizes
- **Upload Progress**: Simulated progress indicators for Qiniu uploads with file size information
- **Rich CLI Output**: Color-coded, formatted output with emojis and clear section headers
- **Detailed Summaries**: Comprehensive upload/download summaries with file listings and statistics

### Improved User Experience
- **Verbose Mode**: Enhanced verbose logging with step-by-step progress updates
- **Error Reporting**: Detailed error messages with file-specific error information
- **File Size Formatting**: Human-readable file size formatting (KB, MB, GB)
- **Visual Separators**: Clear visual separators between different process stages

## Common Development Tasks

1. **Adding new features**: Extend the config object and CLI options
2. **Testing**: Add Jest tests for core functionality
3. **Error handling**: Improve error messages and recovery
4. **Performance**: Optimize large file uploads
5. **Documentation**: Keep README updated with new features
6. **UI/UX Improvements**: Enhance CLI output formatting and user experience