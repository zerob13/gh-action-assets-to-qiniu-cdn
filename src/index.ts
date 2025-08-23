import qiniu from 'qiniu';
import { glob } from 'glob';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import { Octokit } from '@octokit/rest';
import axios from 'axios';
import Ajv from 'ajv';
import extract from 'extract-zip';

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

import type {
  AppConfig,
  DownloadResult,
  UploadResult,
  ProcessResult,
  DownloadedFile
} from './types.js';

const ajv = new Ajv();

// Load schema for validation
const configSchema = await fs.readJson('./config.schema.json');

async function downloadGitHubArtifact(config: AppConfig): Promise<DownloadResult | null> {
  const { github, artifacts, options } = config;
  
  if (!github || !artifacts?.download) {
    return null;
  }

  const { token, owner, repo, runId, artifactName } = github;
  const { downloadDir = './artifacts' } = artifacts;
  
  if (!token || !owner || !repo) {
    throw new Error('GitHub configuration requires token, owner, and repo');
  }

  const octokit = new Octokit({ auth: token });
  
  // Ensure download directory exists (convert to absolute path)
  const absoluteDownloadDir = path.resolve(downloadDir);
  await fs.ensureDir(absoluteDownloadDir);

  let artifactsList: any[];
  
  if (runId) {
    // Get artifacts for specific run
    const response = await octokit.actions.listWorkflowRunArtifacts({
      owner,
      repo,
      run_id: runId
    });
    artifactsList = response.data.artifacts;
  } else {
    // Get all artifacts
    const response = await octokit.actions.listArtifactsForRepo({
      owner,
      repo
    });
    artifactsList = response.data.artifacts;
  }

  if (artifactName) {
    if (Array.isArray(artifactName)) {
      artifactsList = artifactsList.filter(artifact => artifactName.includes(artifact.name));
    } else {
      artifactsList = artifactsList.filter(artifact => artifact.name === artifactName);
    }
  }

  if (artifactsList.length === 0) {
    if (artifactName) {
      const names = Array.isArray(artifactName) ? artifactName.join(', ') : artifactName;
      throw new Error(`No artifacts found matching: ${names}`);
    } else {
      throw new Error('No artifacts found');
    }
  }

  if (options?.verbose) {
    console.log(`\n🎯 Found ${artifactsList.length} artifact(s) to download:`);
    artifactsList.forEach((artifact, index) => {
      const createdDate = new Date(artifact.created_at).toLocaleString();
      const size = artifact.size_in_bytes ? formatBytes(artifact.size_in_bytes) : 'Unknown size';
      console.log(`   ${index + 1}. ${artifact.name} (${size}) - Created: ${createdDate}`);
    });
    console.log(''); // Empty line for better formatting
  }

  const downloadedFiles: DownloadedFile[] = [];

  for (let index = 0; index < artifactsList.length; index++) {
    const artifact = artifactsList[index];
    
    if (options?.verbose) {
      console.log(`📦 [${index + 1}/${artifactsList.length}] Starting download: ${artifact.name}`);
      console.log(`   📋 Artifact ID: ${artifact.id}`);
      console.log(`   📅 Created: ${new Date(artifact.created_at).toLocaleString()}`);
      if (artifact.size_in_bytes) {
        console.log(`   📏 Size: ${formatBytes(artifact.size_in_bytes)}`);
      }
      
      // Check if artifact is expired
      const createdAt = new Date(artifact.created_at);
      const now = new Date();
      const daysOld = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysOld > 90) {
        console.log(`   ⚠️  Warning: Artifact is ${Math.round(daysOld)} days old (GitHub artifacts expire after 90 days)`);
      }
    }
    
    let downloadResponse;
    try {
      downloadResponse = await octokit.actions.downloadArtifact({
        owner,
        repo,
        artifact_id: artifact.id,
        archive_format: 'zip'
      });
      
      if (options?.verbose) {
        console.log(`   🔗 Download URL obtained successfully`);
      }
    } catch (error) {
      if (options?.verbose) {
        console.error(`   ❌ Failed to get download URL for ${artifact.name}:`);
        console.error(`   Error: ${(error as Error).message}`);
        
        if ((error as any).status === 403) {
          console.error(`   💡 This could be due to:`);
          console.error(`      - Artifact has expired (GitHub artifacts expire after 90 days)`);
          console.error(`      - Insufficient token permissions (need 'actions:read' scope)`);
          console.error(`      - Token has expired or is invalid`);
        }
      }
      throw error;
    }

    const downloadUrl = downloadResponse.url;
    const artifactDir = path.join(absoluteDownloadDir, artifact.name);
    const zipPath = path.join(artifactDir, `${artifact.name}.zip`);
    
    await fs.ensureDir(artifactDir);
    
    if (options?.verbose) {
      console.log(`   💾 Saving to: ${zipPath}`);
    }

    // Download the artifact with progress
    // Note: downloadUrl from GitHub API already contains authentication
    let response;
    try {
      response = await axios({
        method: 'GET',
        url: downloadUrl,
        responseType: 'stream',
        timeout: 30000, // 30 second timeout
        headers: {
          'User-Agent': 'gh-action-assets-to-qiniu-cdn/1.0.0'
        }
      });
    } catch (error) {
      if (options?.verbose) {
        console.error(`   ❌ Failed to start download for ${artifact.name}:`);
        console.error(`   Error: ${(error as any).message}`);
        
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 403) {
            console.error(`   💡 HTTP 403 Forbidden - This could be due to:`);
            console.error(`      - Artifact has expired (GitHub artifacts expire after 90 days)`);
            console.error(`      - Download URL has expired (URLs are temporary)`);
            console.error(`      - Insufficient permissions or invalid token`);
          } else if (error.response?.status === 404) {
            console.error(`   💡 HTTP 404 Not Found - Artifact may have been deleted`);
          } else if (error.response?.status) {
            console.error(`   💡 HTTP ${error.response.status}: ${error.response.statusText}`);
          }
        }
      }
      throw error;
    }

    const totalSize = parseInt(response.headers['content-length'] || '0', 10);
    let downloadedSize = 0;
    let lastProgress = 0;
    const startTime = Date.now();
    let lastUpdateTime = startTime;

    const writer = fs.createWriteStream(zipPath);
    
    if (options?.verbose && totalSize > 0) {
      process.stdout.write(`   ⬇️  Starting download... (${formatBytes(totalSize)})\n`);
    }
    
    response.data.on('data', (chunk: Buffer) => {
      downloadedSize += chunk.length;
      const currentTime = Date.now();
      
      if (totalSize > 0 && options?.verbose) {
        const progress = Math.round((downloadedSize / totalSize) * 100);
        const timeDiff = currentTime - lastUpdateTime;
        
        // Update progress every 1% or every 1 second, whichever comes first
        if ((progress !== lastProgress && progress % 1 === 0) || timeDiff >= 1000) {
          const elapsedTime = (currentTime - startTime) / 1000;
          const downloadSpeed = downloadedSize / elapsedTime;
          const eta = totalSize > downloadedSize ? (totalSize - downloadedSize) / downloadSpeed : 0;
          
          // Use ANSI escape codes to update the same line
          process.stdout.write(`\r   📥 Progress: ${progress}% (${formatBytes(downloadedSize)}/${formatBytes(totalSize)}) | Speed: ${formatBytes(downloadSpeed)}/s | ETA: ${Math.round(eta)}s`);
          lastProgress = progress;
          lastUpdateTime = currentTime;
        }
      }
    });

    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    if (options?.verbose) {
      const downloadTime = (Date.now() - startTime) / 1000;
      const avgSpeed = totalSize > 0 ? formatBytes(totalSize / downloadTime) : 'N/A';
      // Add newline to clear the progress line and show completion
      process.stdout.write('\n');
      console.log(`   ✅ Download completed in ${downloadTime.toFixed(1)}s (avg speed: ${avgSpeed}/s)`);
      console.log(`   📂 Extracting archive...`);
    }

    // Extract zip file
    try {
      await extract(zipPath, { dir: artifactDir });
      
      if (options?.verbose) {
        // Count extracted files
        const extractedFiles = await glob('**/*', { cwd: artifactDir, nodir: true });
        process.stdout.write(`\r   🗂️  Extracted ${extractedFiles.length} file(s) to: ${artifactDir}\n`);
      }
    } catch (error) {
      if (options?.verbose) {
        console.error(`   ❌ Failed to extract archive: ${(error as Error).message}`);
      }
      throw new Error(`Failed to extract artifact ${artifact.name}: ${(error as Error).message}`);
    }
    
    // Remove zip file
    await fs.remove(zipPath);
    
    if (options?.verbose) {
      console.log(`   🗑️  Cleaned up zip file`);
    }

    downloadedFiles.push({
      name: artifact.name,
      path: artifactDir,
      createdAt: artifact.created_at
    });

    if (options?.verbose) {
      console.log(`✅ [${index + 1}/${artifactsList.length}] Completed: ${artifact.name}\n`);
    }
  }

  if (options?.verbose && downloadedFiles.length > 0) {
    console.log('🎉 Download Summary:');
    console.log(`   📦 Total artifacts processed: ${downloadedFiles.length}`);
    console.log(`   📁 Download directory: ${downloadDir}`);
    
    let totalExtractedFiles = 0;
    for (const file of downloadedFiles) {
      try {
        const extractedFiles = await glob('**/*', { cwd: file.path, nodir: true });
        totalExtractedFiles += extractedFiles.length;
      } catch (error) {
        // Ignore errors in counting files
      }
    }
    
    if (totalExtractedFiles > 0) {
      console.log(`   📄 Total files extracted: ${totalExtractedFiles}`);
    }
    console.log('');
  }

  return {
    count: downloadedFiles.length,
    files: downloadedFiles,
    downloadDir
  };
}

async function uploadToQiniu(config: AppConfig, sourceDir: string): Promise<UploadResult> {
  const { qiniu: qiniuConfig, artifacts, upload, options } = config;
  
  if (!qiniuConfig) {
    throw new Error('Qiniu configuration is required');
  }

  const { accessKey, secretKey, bucket, zone = 'z0' } = qiniuConfig;
  const { patterns = ['**/*'], pathMapping = {} } = artifacts || {};
  const { cdnBasePath = '/', overwrite = true, cleanupAfterUpload = true } = upload || {};
  
  // Configure Qiniu
  const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
  const qiniuSdkConfig = new qiniu.conf.Config();
  qiniuSdkConfig.zone = (qiniu.zone as any)[zone];
  const formUploader = new qiniu.form_up.FormUploader(qiniuSdkConfig);
  const putExtra = new qiniu.form_up.PutExtra();

  // Find files to upload (exclude directories)
  const files: string[] = [];
  for (const pattern of patterns) {
    const matches = glob.sync(pattern, { cwd: sourceDir, absolute: true, nodir: true });
    files.push(...matches);
  }

  // Filter out any remaining directories (in case glob nodir doesn't work perfectly)
  const fileStats = await Promise.all(files.map(async file => {
    const stat = await fs.stat(file);
    return { file, isFile: stat.isFile() };
  }));
  
  const filteredFiles = fileStats.filter(({ isFile }) => isFile).map(({ file }) => file);

  if (filteredFiles.length === 0) {
    throw new Error('No files found matching the specified patterns');
  }

  if (options?.verbose) {
    console.log(`📁 Found ${filteredFiles.length} files to upload from: ${sourceDir}`);
  }

  // Upload files
  const uploadedFiles: any[] = [];
  const failedFiles: any[] = [];

  for (const localFilePath of filteredFiles) {
    const relativePath = path.relative(sourceDir, localFilePath);
    
    // Apply path mapping
    let cdnFilePath = relativePath;
    for (const [localPattern, cdnReplacement] of Object.entries(pathMapping)) {
      if (cdnFilePath.startsWith(localPattern)) {
        cdnFilePath = cdnFilePath.replace(localPattern, cdnReplacement);
        break;
      }
    }

    // Ensure proper path formatting
    cdnFilePath = path.join(cdnBasePath, cdnFilePath).replace(/\\/g, '/');
    if (cdnFilePath.startsWith('/')) {
      cdnFilePath = cdnFilePath.substring(1);
    }

    try {
      if (options?.verbose) {
        console.log(`⬆️  Uploading: ${relativePath} -> ${cdnFilePath}`);
      }

      // Generate upload token
      const putPolicy = new qiniu.rs.PutPolicy({
        scope: bucket,
        expires: 3600,
        insertOnly: overwrite ? 0 : 1
      });
      const uploadToken = putPolicy.uploadToken(mac);

      // Upload file with progress
      const fileStats = await fs.stat(localFilePath);
      const fileSize = fileStats.size;
      let uploadedBytes = 0;
      let lastUploadProgress = 0;

      const response = await new Promise((resolve, reject) => {
        formUploader.putFile(
          uploadToken,
          cdnFilePath,
          localFilePath,
          putExtra,
          (err: any, body: any, info: any) => {
            if (err) {
              reject(err);
            } else if (info.statusCode === 200) {
              resolve(body);
            } else {
              reject(new Error(`Upload failed: ${info.statusCode}`));
            }
          }
        );
      });

      // Simulate progress updates for Qiniu upload (since SDK doesn't provide progress events)
      if (options?.verbose && fileSize > 0) {
        const uploadInterval = setInterval(() => {
          if (uploadedBytes < fileSize) {
            uploadedBytes = Math.min(uploadedBytes + Math.floor(fileSize / 10), fileSize);
            const progress = Math.round((uploadedBytes / fileSize) * 100);
            if (progress !== lastUploadProgress && progress % 10 === 0) {
              process.stdout.write(`\r📤 Uploading ${relativePath}: ${progress}% (${formatBytes(uploadedBytes)}/${formatBytes(fileSize)})`);
              lastUploadProgress = progress;
            }
          } else {
            clearInterval(uploadInterval);
          }
        }, 300);
        
        // Wait for upload to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        clearInterval(uploadInterval);
        // Add newline to clear the upload progress line
        process.stdout.write('\n');
      }

      uploadedFiles.push({
        local: relativePath,
        remote: cdnFilePath,
        key: (response as any).key,
        hash: (response as any).hash,
        size: (response as any).fsize
      });

      if (options?.verbose) {
        console.log(`✅ Uploaded: ${cdnFilePath}`);
      }

    } catch (error) {
      failedFiles.push({
        local: relativePath,
        remote: cdnFilePath,
        error: (error as Error).message
      });

      if (options?.verbose) {
        console.error(`❌ Failed to upload ${relativePath}: ${(error as Error).message}`);
      }
    }
  }

  // Cleanup if requested
  if (cleanupAfterUpload) {
    if (options?.verbose) {
      console.log('🧹 Cleaning up local files...');
    }
    for (const file of files) {
      try {
        await fs.remove(file);
      } catch (error) {
        if (options?.verbose) {
          console.warn(`⚠️  Could not cleanup file ${file}: ${(error as Error).message}`);
        }
      }
    }
  }

  return {
    totalCount: files.length,
    successCount: uploadedFiles.length,
    failedCount: failedFiles.length,
    files: uploadedFiles,
    failedFiles
  };
}

async function runPostProcessScript(config: AppConfig, workingDir: string): Promise<void> {
  const { processing, options } = config;
  
  if (!processing?.postProcessScript) {
    return;
  }

  const { postProcessScript, workingDirectory = workingDir } = processing;
  
  if (options?.verbose) {
    console.log(`⚡ Running post-processing script: ${postProcessScript}`);
  }

  try {
    execSync(postProcessScript, { 
      cwd: workingDirectory, 
      stdio: options?.verbose ? 'inherit' : 'pipe',
      timeout: options?.timeout || 30000
    });
    
    if (options?.verbose) {
      console.log('✅ Post-processing script completed successfully');
    }
  } catch (error) {
    throw new Error(`Post-processing script failed: ${(error as Error).message}`);
  }
}

function validateConfig(config: AppConfig): void {
  const validate = ajv.compile(configSchema);
  const valid = validate(config);
  
  if (!valid) {
    const errors = validate.errors?.map(err => 
      `${err.instancePath} ${err.message}`
    ).join('\n') || 'Unknown validation error';
    throw new Error(`Configuration validation failed:\n${errors}`);
  }
}

export async function processArtifacts(config: AppConfig): Promise<ProcessResult> {
  // Validate configuration
  validateConfig(config);

  const { options } = config;
  
  if (options?.verbose) {
    console.log('🚀 Starting artifact processing...');
    console.log('📋 Configuration validated successfully');
  }

  let downloadResult: DownloadResult | null = null;
  let workingDir = process.cwd();

  // Download artifacts from GitHub if configured
  if (config.artifacts?.download) {
    if (options?.verbose) {
      console.log('\n📥 Downloading artifacts from GitHub...');
    }
    downloadResult = await downloadGitHubArtifact(config);
    if (downloadResult) {
      workingDir = downloadResult.downloadDir;
      if (options?.verbose) {
        console.log('✅ Artifact download completed');
      }
    }
  }

  // Run post-processing script
  if (config.processing?.postProcessScript) {
    if (options?.verbose) {
      console.log('\n⚡ Running post-processing script...');
    }
    await runPostProcessScript(config, workingDir);
  }

  // Upload to Qiniu
  if (options?.verbose) {
    console.log('\n📤 Uploading files to Qiniu CDN...');
  }
  const uploadResult = await uploadToQiniu(config, workingDir);

  if (options?.verbose) {
    console.log('✅ Upload process completed');
  }

  const result: ProcessResult = {
    uploaded: uploadResult
  };
  
  if (downloadResult) {
    result.downloaded = downloadResult;
  }
  
  return result;
}