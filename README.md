# GitHub Action Artifacts to Qiniu CDN Uploader

A CLI tool to download GitHub Action artifacts and upload them to Qiniu CDN with a simple JSON configuration.

## Features

- ⬇️ **Download GitHub Actions artifacts** automatically
- ⬆️ **Upload to Qiniu CDN** with flexible path mapping
- ⚡ **Post-processing scripts** for file optimization
- 🗺️ **JSON configuration** - simple and maintainable
- 🔐 **Secure credential management**
- 📊 **Detailed progress reporting**
- 🧹 **Automatic cleanup** options

## Installation

### Using pnpm (Recommended)

```bash
# Install globally with pnpm
pnpm install -g gh-action-assets-to-qiniu-cdn

# Or use with pnpm dlx
pnpm dlx gh-action-assets-to-qiniu-cdn

# Or install locally
pnpm install gh-action-assets-to-qiniu-cdn
```

### Using npm/npx

```bash
# Install globally with npm
npm install -g gh-action-assets-to-qiniu-cdn

# Or use with npx
npx gh-action-assets-to-qiniu-cdn
```

## Quick Start

### 1. Create a configuration file

Create `config.json` in your project:

```json
{
  "version": "1.0.0",
  "qiniu": {
    "accessKey": "your_qiniu_access_key",
    "secretKey": "your_qiniu_secret_key",
    "bucket": "your_bucket_name",
    "zone": "z0"
  },
  "artifacts": {
    "patterns": ["dist/**", "build/*.zip"],
    "pathMapping": {
      "dist/": "static/",
      "build/": "releases/"
    }
  },
  "upload": {
    "cdnBasePath": "assets/",
    "overwrite": true,
    "cleanupAfterUpload": true
  },
  "options": {
    "verbose": true
  }
}
```

### 2. Run the tool

```bash
# Basic usage (uses config.json)
action-to-qiniu

# With custom config file
action-to-qiniu -c config.production.json

# Enable verbose logging
action-to-qiniu -v
```

## Configuration Reference

### Basic Configuration

```json
{
  "version": "1.0.0",
  "qiniu": {
    "accessKey": "string",        // Required: Qiniu Access Key
    "secretKey": "string",        // Required: Qiniu Secret Key
    "bucket": "string",           // Required: Qiniu Bucket Name
    "zone": "z0"                  // Optional: Qiniu zone (z0, z1, z2, na0, as0)
  },
  "artifacts": {
    "patterns": ["**/*"],         // File patterns to upload
    "pathMapping": {}             // Local to CDN path mapping
  },
  "upload": {
    "cdnBasePath": "/",           // Base path on CDN
    "overwrite": true,            // Overwrite existing files
    "cleanupAfterUpload": true    // Cleanup after upload
  },
  "options": {
    "verbose": false,             // Enable verbose logging
    "maxRetries": 3,              // Upload retry attempts
    "timeout": 30000              // Operation timeout in ms
  }
}
```

### GitHub Artifact Download

To download artifacts from GitHub Actions:

```json
{
  "github": {
    "token": "ghp_...",           // GitHub Personal Access Token
    "owner": "your-username",     // Repository owner
    "repo": "your-repo",          // Repository name
    "runId": 123456789,           // Optional: Specific workflow run ID
    "artifactName": "build"       // Optional: Specific artifact name or array of names
  },
  "artifacts": {
    "download": true,             // Enable artifact download
    "downloadDir": "./artifacts"  // Download directory
  }
}
```

### Post-Processing

Run scripts before uploading:

```json
{
  "processing": {
    "postProcessScript": "npm run optimize",
    "workingDirectory": "./artifacts"
  }
}
```

## Advanced Examples

### Complete Example with GitHub Download

```json
{
  "version": "1.0.0",
  "qiniu": {
    "accessKey": "qiniu_access_key",
    "secretKey": "qiniu_secret_key",
    "bucket": "my-bucket",
    "zone": "z0"
  },
  "github": {
    "token": "github_pat_...",
    "owner": "my-organization",
    "repo": "my-project",
    "artifactName": ["production-build", "documentation", "test-coverage"]
  },
  "artifacts": {
    "download": true,
    "downloadDir": "./downloaded-artifacts",
    "patterns": ["dist/**", "*.zip"],
    "pathMapping": {
      "dist/": "static/",
      "build/": "releases/v1.0.0/"
    }
  },
  "upload": {
    "cdnBasePath": "cdn-assets/",
    "overwrite": true,
    "cleanupAfterUpload": true
  },
  "processing": {
    "postProcessScript": "npm run compress-assets",
    "workingDirectory": "./downloaded-artifacts"
  },
  "options": {
    "verbose": true,
    "maxRetries": 3,
    "timeout": 60000
  }
}
```

### Local Files Only

```json
{
  "qiniu": {
    "accessKey": "qiniu_key",
    "secretKey": "qiniu_secret", 
    "bucket": "my-bucket"
  },
  "artifacts": {
    "patterns": ["dist/**", "build/*.tar.gz"],
    "pathMapping": {
      "dist/js/": "scripts/",
      "dist/css/": "styles/"
    }
  },
  "upload": {
    "cdnBasePath": "",
    "overwrite": false
  }
}
```

## Advanced Examples

### Complex Path Mapping

```bash
action-to-qiniu \
  -a YOUR_ACCESS_KEY \
  -s YOUR_SECRET_KEY \
  -b YOUR_BUCKET \
  -p "dist/**,build/*.zip,packages/*/lib/**" \
  --cdn-base-path "cdn-assets/" \
  --path-mapping '{
    "dist/js/": "scripts/",
    "dist/css/": "styles/",
    "build/": "releases/v1.0.0/",
    "packages/app/lib/": "app/",
    "packages/utils/lib/": "utils/"
  }' \
  --post-process "npm run compress-assets" \
  --verbose
```

### GitHub Actions Integration

Create a workflow that downloads artifacts and uploads to Qiniu:

```yaml
name: Upload to Qiniu CDN

on:
  release:
    types: [published]

jobs:
  upload-assets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: production-build
          path: ./artifacts
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Upload to Qiniu CDN
        run: |
          npx gh-action-assets-to-qiniu-cdn \
            --access-key ${{ secrets.QINIU_ACCESS_KEY }} \
            --secret-key ${{ secrets.QINIU_SECRET_KEY }} \
            --bucket ${{ secrets.QINIU_BUCKET }} \
            --patterns "**/*" \
            --source-dir ./artifacts \
            --cdn-base-path "releases/${{ github.ref_name }}/" \
            --path-mapping '{"dist/": "", "build/": ""}'
        env:
          QINIU_ZONE: z0
```

## Path Mapping Examples

### Basic Mapping
```json
{"dist/": "static/"}
# dist/main.js → static/main.js
# dist/css/app.css → static/css/app.css
```

### Multiple Mappings
```json
{
  "dist/js/": "scripts/",
  "dist/css/": "styles/",
  "assets/": "media/"
}
# dist/js/app.js → scripts/app.js
# dist/css/style.css → styles/style.css
# assets/images/logo.png → media/images/logo.png
```

### Versioned Releases
```json
{"build/": "releases/v1.2.3/"}
# build/app.zip → releases/v1.2.3/app.zip
```

## Security Notes

- Credentials are never logged, even in verbose mode
- Use environment variables instead of config file for production
- Never commit config files with credentials to version control
- Consider using secret management services for production environments

## Development

This project is built with TypeScript and designed to run with Node.js and pnpm.

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

### TypeScript Development

The project includes comprehensive TypeScript types:
- Full type definitions for configuration
- Type-safe function interfaces
- JSON schema validation
- Editor support with TypeScript

## License

MIT License - see LICENSE file for details.
