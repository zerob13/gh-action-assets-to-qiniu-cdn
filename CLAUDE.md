# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript CLI tool for uploading GitHub Action artifacts to Qiniu CDN, designed to run with Node.js and pnpm. It provides flexible file mapping, post-processing, and multiple configuration options with full type safety.

## Project Structure

```
├── src/
│   ├── index.ts         # Core upload functionality
│   ├── cli.ts           # CLI interface and argument parsing
│   └── types.ts         # TypeScript type definitions
├── test/                # Test files (to be implemented)
├── config.schema.json   # JSON schema for configuration validation
├── config.example.json  # Example configuration file
├── package.json         # Project dependencies and scripts
├── README.md           # Comprehensive documentation
└── LICENSE             # MIT License
```

## Key Components

1. **CLI Interface** (`src/cli.ts`): Command-line argument parsing using Commander
2. **Core Logic** (`src/index.ts`): Qiniu SDK integration and file processing
3. **Configuration**: JSON configuration file with schema validation
4. **File Processing**: Glob pattern matching and path mapping
5. **Post-processing**: Script execution before upload
6. **Type Safety**: Full TypeScript support with comprehensive type definitions

## Development Commands

```bash
# Install dependencies
pnpm install

# Build TypeScript to JavaScript
pnpm run build

# Run with example config (development mode)
pnpm run dev

# Run with custom config
pnpm run dev -- -c config.example.json -v

# Run tests
pnpm test

# Start the built version
pnpm start

# Lint code
pnpm run lint

# Clean build artifacts
pnpm run clean
```

## Configuration System

The tool uses a JSON configuration file with schema validation:
1. **Primary Configuration**: JSON file (default: `config.json`)
2. **CLI Options**: Command-line options override config file settings
3. **Schema Validation**: Automatic validation using `config.schema.json`

### Command Line Options
- **Config File**: `-c, --config <path>` (default: `config.json`)
- **Verbose Mode**: `-v, --verbose` (default: enabled)
- **Disable Verbose**: `--no-verbose` (disable detailed logging)

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

- Credentials are never logged, even in verbose mode
- Configuration files with credentials should not be committed to version control
- Use secure secret management in production environments (CI/CD secrets)
- JSON schema validation ensures configuration integrity

## Enhanced Features

### Progress Indicators & Rich Output
- **In-Place Download Progress**: Real-time progress updates using ANSI escape codes (no multiple lines)
- **In-Place Upload Progress**: Simulated progress indicators for Qiniu uploads with file size information
- **Rich CLI Output**: Color-coded, formatted output with emojis and clear section headers
- **Detailed Summaries**: Comprehensive upload/download summaries with file listings and statistics

### Improved User Experience
- **Verbose Mode**: Enhanced verbose logging with step-by-step progress updates
- **Multiple Artifact Support**: Download multiple artifacts using array configuration
- **Absolute Path Handling**: Automatic conversion of relative paths to absolute for reliable extraction
- **Error Reporting**: Detailed error messages with file-specific error information
- **File Size Formatting**: Human-readable file size formatting (KB, MB, GB)
- **Visual Separators**: Clear visual separators between different process stages

## Common Development Tasks

1. **Adding new features**: Extend the config schema and TypeScript types
2. **Testing**: Add Jest tests for core functionality
3. **Error handling**: Improve error messages and recovery
4. **Performance**: Optimize large file uploads
5. **Configuration**: Update JSON schema for new configuration options
6. **Documentation**: Keep README updated with new features
7. **Type Safety**: Maintain comprehensive TypeScript type definitions
8. **UI/UX Improvements**: Enhance CLI output formatting and user experience