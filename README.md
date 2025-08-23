# GitHub Action Artifacts to Qiniu CDN Uploader

A CLI tool to download GitHub Action artifacts and upload them to Qiniu CDN with a simple JSON configuration.

## Features

- ⬇️ **Download GitHub Actions artifacts** automatically
- ⬆️ **Upload to Qiniu CDN** with flexible path mapping
- ⚡ **Post-processing scripts** for file optimization
- 🗺️ **JSON configuration** - simple and maintainable
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
  "$schema": "./config.schema.json",
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
# Basic usage (uses config.json in current directory)
action-to-qiniu

# With custom config file
action-to-qiniu -c config.production.json

# Enable/disable verbose logging (默认开启)
action-to-qiniu -v          # 显式开启详细日志
action-to-qiniu --no-verbose # 关闭详细日志
```

## Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `-c, --config <path>` | Path to configuration file | `config.json` |
| `-v, --verbose` | Enable verbose logging | `true` |
| `--no-verbose` | Disable verbose logging | - |

## Configuration Reference

### Complete Configuration Schema

```json
{
  "version": "1.0.0",                        // 配置文件版本号
  
  // 七牛云配置（必需）
  "qiniu": {
    "accessKey": "string",                   // 七牛云 Access Key（必需）
    "secretKey": "string",                   // 七牛云 Secret Key（必需）
    "bucket": "string",                      // 七牛云存储空间名（必需）
    "zone": "z0"                            // 七牛云区域：z0(华东), z1(华北), z2(华南), na0(北美), as0(东南亚)
  },
  
  // GitHub 配置（下载 artifacts 时需要）
  "github": {
    "token": "ghp_...",                     // GitHub Personal Access Token
    "owner": "username",                    // 仓库所有者
    "repo": "repository",                   // 仓库名
    "runId": 123456789,                     // 可选：指定工作流运行 ID
    "artifactName": "build"                 // 可选：指定 artifact 名称或名称数组
  },
  
  // 文件配置
  "artifacts": {
    "download": true,                       // 是否从 GitHub 下载 artifacts
    "downloadDir": "./artifacts",           // 下载目录
    "patterns": ["**/*"],                   // 文件匹配模式（glob 语法）
    "pathMapping": {                        // 路径映射：本地路径 -> CDN 路径
      "dist/": "static/",
      "build/": "releases/"
    }
  },
  
  // 上传配置
  "upload": {
    "cdnBasePath": "/",                     // CDN 基础路径
    "overwrite": true,                      // 是否覆盖已存在文件
    "cleanupAfterUpload": true              // 上传后是否清理本地文件
  },
  
  // 后处理配置
  "processing": {
    "postProcessScript": "npm run build",   // 上传前执行的脚本
    "workingDirectory": "./artifacts"       // 脚本执行目录
  },
  
  // 选项配置
  "options": {
    "verbose": true,                        // 详细日志输出
    "maxRetries": 3,                        // 上传重试次数
    "timeout": 30000                        // 操作超时时间（毫秒）
  }
}
```

### 配置项详细说明

#### qiniu (七牛云配置)
- **accessKey**: 七牛云 Access Key，在七牛云控制台获取
- **secretKey**: 七牛云 Secret Key，在七牛云控制台获取
- **bucket**: 七牛云存储空间名称
- **zone**: 七牛云区域代码
  - `z0`: 华东（默认）
  - `z1`: 华北
  - `z2`: 华南
  - `na0`: 北美
  - `as0`: 东南亚

#### github (GitHub 配置)
- **token**: GitHub Personal Access Token，需要 `actions:read` 权限
- **owner**: GitHub 仓库所有者用户名或组织名
- **repo**: GitHub 仓库名
- **runId**: 可选，指定特定的工作流运行 ID
- **artifactName**: 可选，指定要下载的 artifact 名称，支持字符串或字符串数组

#### artifacts (文件配置)
- **download**: 布尔值，是否启用从 GitHub 下载 artifacts
- **downloadDir**: 下载目录，默认为 `./artifacts`
- **patterns**: 文件匹配模式数组，使用 glob 语法
- **pathMapping**: 路径映射对象，键为本地路径前缀，值为 CDN 路径前缀

#### upload (上传配置)
- **cdnBasePath**: CDN 上的基础路径前缀
- **overwrite**: 是否覆盖 CDN 上已存在的文件
- **cleanupAfterUpload**: 上传成功后是否删除本地文件

#### processing (后处理配置)
- **postProcessScript**: 在上传前执行的脚本命令
- **workingDirectory**: 脚本执行的工作目录

#### options (选项配置)
- **verbose**: 是否启用详细日志输出
- **maxRetries**: 上传失败时的重试次数
- **timeout**: 操作超时时间（毫秒）

## 配置示例

### 1. 仅上传本地文件

```json
{
  "version": "1.0.0",
  "qiniu": {
    "accessKey": "your_qiniu_access_key",
    "secretKey": "your_qiniu_secret_key",
    "bucket": "my-bucket",
    "zone": "z0"
  },
  "artifacts": {
    "patterns": ["dist/**", "build/*.zip"],
    "pathMapping": {
      "dist/js/": "scripts/",
      "dist/css/": "styles/"
    }
  },
  "upload": {
    "cdnBasePath": "assets/",
    "overwrite": true
  }
}
```

### 2. 从 GitHub 下载并上传

```json
{
  "version": "1.0.0",
  "qiniu": {
    "accessKey": "your_qiniu_access_key",
    "secretKey": "your_qiniu_secret_key",
    "bucket": "my-bucket",
    "zone": "z0"
  },
  "github": {
    "token": "ghp_your_github_token",
    "owner": "your-username",
    "repo": "your-repo",
    "artifactName": "production-build"
  },
  "artifacts": {
    "download": true,
    "downloadDir": "./artifacts",
    "patterns": ["**/*"],
    "pathMapping": {
      "dist/": "static/"
    }
  },
  "upload": {
    "cdnBasePath": "releases/",
    "overwrite": true,
    "cleanupAfterUpload": true
  }
}
```

### 3. 多平台构建分发

```json
{
  "version": "1.0.0",
  "qiniu": {
    "accessKey": "your_qiniu_access_key",
    "secretKey": "your_qiniu_secret_key",
    "bucket": "my-bucket",
    "zone": "z0"
  },
  "github": {
    "token": "your_github_token",
    "owner": "your-username",
    "repo": "your-repo",
    "artifactName": ["artifact-linux-x64", "artifact-mac-arm64", "artifact-win-x64"]
  },
  "artifacts": {
    "download": true,
    "downloadDir": "./downloaded-artifacts",
    "patterns": ["**/*"],
    "pathMapping": {
      "artifact-linux-x64/": "distdir/linux/",
      "artifact-mac-arm64/": "distdir/mac/",
      "artifact-win-x64/": "distdir/windows/"
    }
  },
  "upload": {
    "cdnBasePath": "",
    "overwrite": true,
    "cleanupAfterUpload": false
  },
  "options": {
    "verbose": true,
    "timeout": 60000
  }
}
```

### 4. 带后处理的完整示例

```json
{
  "version": "1.0.0",
  "qiniu": {
    "accessKey": "your_qiniu_access_key",
    "secretKey": "your_qiniu_secret_key",
    "bucket": "my-bucket",
    "zone": "z0"
  },
  "github": {
    "token": "your_github_token",
    "owner": "your-org",
    "repo": "your-project",
    "artifactName": ["build-assets", "documentation"]
  },
  "artifacts": {
    "download": true,
    "downloadDir": "./artifacts",
    "patterns": ["dist/**", "docs/**"],
    "pathMapping": {
      "dist/": "static/",
      "docs/": "help/"
    }
  },
  "upload": {
    "cdnBasePath": "v1.0.0/",
    "overwrite": true,
    "cleanupAfterUpload": true
  },
  "processing": {
    "postProcessScript": "npm run compress && npm run optimize",
    "workingDirectory": "./artifacts"
  },
  "options": {
    "verbose": true,
    "maxRetries": 3,
    "timeout": 60000
  }
}
```

## GitHub Actions 集成

在 GitHub Actions 中使用此工具：

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
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Create config file
        run: |
          cat > config.json << EOF
          {
            "version": "1.0.0",
            "qiniu": {
              "accessKey": "${{ secrets.QINIU_ACCESS_KEY }}",
              "secretKey": "${{ secrets.QINIU_SECRET_KEY }}",
              "bucket": "${{ secrets.QINIU_BUCKET }}",
              "zone": "z0"
            },
            "github": {
              "token": "${{ secrets.GITHUB_TOKEN }}",
              "owner": "${{ github.repository_owner }}",
              "repo": "${{ github.event.repository.name }}",
              "artifactName": "production-build"
            },
            "artifacts": {
              "download": true,
              "patterns": ["**/*"],
              "pathMapping": {
                "dist/": "releases/${{ github.ref_name }}/"
              }
            },
            "upload": {
              "overwrite": true,
              "cleanupAfterUpload": true
            }
          }
          EOF
      
      - name: Upload to Qiniu CDN
        run: npx gh-action-assets-to-qiniu-cdn -c config.json -v
```

## 路径映射说明

路径映射用于将本地文件路径转换为 CDN 上的路径：

### 基础映射
```json
{
  "pathMapping": {
    "dist/": "static/"
  }
}
```
- `dist/main.js` → `static/main.js`
- `dist/css/app.css` → `static/css/app.css`

### 多路径映射
```json
{
  "pathMapping": {
    "dist/js/": "scripts/",
    "dist/css/": "styles/",
    "assets/": "media/"
  }
}
```
- `dist/js/app.js` → `scripts/app.js`
- `dist/css/style.css` → `styles/style.css`
- `assets/logo.png` → `media/logo.png`

### 版本发布
```json
{
  "pathMapping": {
    "build/": "releases/v1.2.3/"
  }
}
```
- `build/app.zip` → `releases/v1.2.3/app.zip`

## 文件模式匹配

支持强大的 glob 模式文件选择：

```json
{
  "artifacts": {
    "patterns": [
      "**/*.js",                // 所有 JavaScript 文件
      "**/*.css",               // 所有 CSS 文件
      "dist/**",                // dist 目录下所有文件
      "build/*.{zip,tar.gz}",   // build 目录下的压缩文件
      "!**/*.test.js",          // 排除测试文件
      "!**/node_modules/**"     // 排除 node_modules
    ]
  }
}
```

## 安全注意事项

- 凭据信息永远不会被记录到日志中
- 生产环境请妥善保管 Access Key 和 Secret Key
- 不要将包含凭据的配置文件提交到版本控制系统
- 建议在 CI/CD 环境中使用 secrets 管理凭据

## 故障排除

### 常见问题

#### 找不到匹配的 artifacts
- **原因**: Artifact 名称不匹配或已过期（GitHub artifacts 90天后过期）
- **解决**: 检查 GitHub Actions 中的 artifact 名称，确保未超过90天

#### HTTP 403 下载失败
- **原因**: GitHub token 权限不足或已过期
- **解决**: 确保 token 有 `actions:read` 权限，重新生成 token

#### 上传超时或连接问题
- **原因**: 网络问题或七牛云区域配置错误
- **解决**: 检查七牛云 zone 设置和网络连接

#### 目录上传错误
- **原因**: 尝试上传目录而不是文件
- **解决**: 检查 glob 模式是否正确匹配文件

### 调试模式

启用详细日志查看详细进度：

```bash
# 启用详细日志
action-to-qiniu -v

# 将日志保存到文件
action-to-qiniu -v 2>&1 | tee upload.log
```

## 开发

本项目使用 TypeScript 构建，基于 Node.js 和 pnpm 运行。

```bash
# 安装依赖
pnpm install

# 构建 TypeScript 到 JavaScript
pnpm run build

# 开发模式运行
pnpm run dev

# 使用自定义配置运行
pnpm run dev -- -c config.example.json -v

# 运行测试
pnpm test

# 运行构建版本
pnpm start

# 代码检查
pnpm run lint

# 清理构建文件
pnpm run clean
```

### TypeScript 特性

项目包含完整的 TypeScript 类型：
- 配置文件的完整类型定义
- 类型安全的函数接口
- JSON Schema 验证
- 编辑器完整支持

## 许可证

MIT License - 详见 LICENSE 文件。
