# QWEN.md

This file provides guidance to Qwen Code when working with code in this repository.

## Project Overview

This is a TypeScript CLI tool for uploading GitHub Action artifacts to Qiniu CDN, designed to run with Node.js and pnpm. It provides flexible file mapping, post-processing, and multiple configuration options with full type safety.

## Project Structure

```
├── src/
│   ├── index.ts          # Core upload functionality
│   ├── cli.ts           # CLI interface and argument parsing
│   └── types.ts         # TypeScript type definitions
├── .env.example         # Example environment configuration
├── .gitignore          # Git ignore patterns
├── package.json         # Project dependencies and scripts
├── README.md           # Comprehensive documentation
├── config.example.json  # Example configuration
├── config.schema.json   # JSON schema for config validation
└── LICENSE             # MIT License
```

## Key Components

1. **CLI Interface** (`src/cli.ts`): Command-line argument parsing using Commander
2. **Core Logic** (`src/index.ts`): Qiniu SDK integration, GitHub artifact download, and file processing
3. **Type Definitions** (`src/types.ts`): TypeScript interfaces for type safety
4. **Configuration**: Support for CLI args, environment variables, JSON config files, and .env files
5. **File Processing**: Glob pattern matching and path mapping
6. **Post-processing**: Script execution before upload

## Development Commands

```bash
# Install dependencies with pnpm
pnpm install

# Build TypeScript to JavaScript
pnpm run build

# Run with example config (development mode)
pnpm run dev

# Run with custom config
pnpm run dev -- -c config.example.json -v

# Run tests (when implemented)
pnpm test

# Start the built version
pnpm start

# Lint code
pnpm run lint

# Clean build artifacts
pnpm run clean

# Install globally for CLI usage
pnpm install -g .
```

## Configuration System

The tool supports multiple configuration sources (in order of priority):
1. CLI arguments (highest priority)
2. Environment variables
3. .env file values
4. JSON configuration files
5. Default values

## Core Features

- **GitHub Artifact Download**: Downloads artifacts from GitHub Actions using Octokit
- **Qiniu Integration**: Uses the official Qiniu Node.js SDK with all zone support
- **File Processing**: Glob pattern matching with flexible path mapping
- **Post-processing**: Script execution before upload operations
- **Validation**: JSON schema validation for configuration files
- **Error Handling**: Comprehensive error handling and verbose logging

## Qiniu Integration

- Uses the official Qiniu Node.js SDK (v7.8.0)
- Supports all Qiniu zones (z0, z1, z2, na0, as0)
- Proper error handling for upload failures
- Configurable overwrite behavior
- Automatic cleanup after upload

## Security Considerations

- Credentials are never logged
- .env files are gitignored by default
- Environment variables are recommended for production
- Secret management best practices are documented
- GitHub tokens are handled securely

## Common Development Tasks

1. **Adding new features**: Extend the config object and CLI options
2. **Testing**: Add test files for core functionality
3. **Error handling**: Improve error messages and recovery mechanisms
4. **Performance**: Optimize large file uploads and downloads
5. **Documentation**: Keep README and configuration examples updated
6. **Type safety**: Maintain comprehensive TypeScript definitions

## TypeScript Support

- Full TypeScript implementation with strict type checking
- Comprehensive type definitions in `src/types.ts`
- JSON schema validation for configuration files
- Modern ES module syntax

## Dependencies

- **Runtime**: qiniu, glob, fs-extra, commander, chalk, @octokit/rest, axios, ajv, extract-zip
- **Dev**: @types packages for TypeScript, TypeScript compiler
- **Runtime**: Node.js (>=18.0.0)
- **Package Manager**: pnpm

## File Processing Patterns

- Supports glob patterns for file selection
- Flexible path mapping for CDN path customization
- Configurable base path for CDN uploads
- Automatic cleanup options

## Error Recovery

- Graceful handling of network failures
- Detailed error reporting with file-specific information
- Configurable timeout settings
- Verbose logging for debugging