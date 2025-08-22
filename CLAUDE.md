# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a CLI tool for uploading GitHub Action artifacts to Qiniu CDN. It provides flexible file mapping, post-processing, and multiple configuration options.

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
# Install dependencies
npm install

# Run with example config (development mode)
npm run dev

# Run with custom config
node src/cli.js -c config.example.json -v

# Run tests (when implemented)
npm test

# Lint code
npm run lint

# Install globally for CLI usage
npm install -g .
```

## Configuration System

The tool supports multiple configuration sources (in order of priority):
1. CLI arguments (highest priority)
2. Environment variables
3. .env file values
4. Default values

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

## Common Development Tasks

1. **Adding new features**: Extend the config object and CLI options
2. **Testing**: Add Jest tests for core functionality
3. **Error handling**: Improve error messages and recovery
4. **Performance**: Optimize large file uploads
5. **Documentation**: Keep README updated with new features