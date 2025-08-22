import qiniu from 'qiniu';
import { glob } from 'glob';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import { Octokit } from '@octokit/rest';
import axios from 'axios';
import Ajv from 'ajv';
import extract from 'extract-zip';

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
  
  // Ensure download directory exists
  await fs.ensureDir(downloadDir);

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
    artifactsList = artifactsList.filter(artifact => artifact.name === artifactName);
  }

  if (artifactsList.length === 0) {
    throw new Error('No artifacts found matching criteria');
  }

  const downloadedFiles: DownloadedFile[] = [];

  for (const artifact of artifactsList) {
    const downloadResponse = await octokit.actions.downloadArtifact({
      owner,
      repo,
      artifact_id: artifact.id,
      archive_format: 'zip'
    });

    const downloadUrl = downloadResponse.url;
    const artifactDir = path.join(downloadDir, artifact.name);
    const zipPath = path.join(artifactDir, `${artifact.name}.zip`);
    
    await fs.ensureDir(artifactDir);

    // Download the artifact
    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'stream',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    const writer = fs.createWriteStream(zipPath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Extract zip file
    await extract(zipPath, { dir: artifactDir });
    
    // Remove zip file
    await fs.remove(zipPath);

    downloadedFiles.push({
      name: artifact.name,
      path: artifactDir,
      createdAt: artifact.created_at
    });

    if (options?.verbose) {
      console.log(`✅ Downloaded artifact: ${artifact.name}`);
    }
  }

  return {
    count: downloadedFiles.length,
    files: downloadedFiles,
    downloadDir
  };
}

async function uploadToQiniu(config: AppConfig, sourceDir: string): Promise<UploadResult> {
  const { qiniu, artifacts, upload, options } = config;
  
  if (!qiniu) {
    throw new Error('Qiniu configuration is required');
  }

  const { accessKey, secretKey, bucket, zone = 'z0' } = qiniu;
  const { patterns = ['**/*'], pathMapping = {} } = artifacts || {};
  const { cdnBasePath = '/', overwrite = true, cleanupAfterUpload = true } = upload || {};
  
  // Configure Qiniu
  const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
  const qiniuConfig = new qiniu.conf.Config();
  qiniuConfig.zone = (qiniu.zone as any)[zone];
  const formUploader = new qiniu.form_up.FormUploader(qiniuConfig);
  const putExtra = new qiniu.form_up.PutExtra();

  // Find files to upload
  const files: string[] = [];
  for (const pattern of patterns) {
    const matches = glob.sync(pattern, { cwd: sourceDir, absolute: true });
    files.push(...matches);
  }

  if (files.length === 0) {
    throw new Error('No files found matching the specified patterns');
  }

  if (options?.verbose) {
    console.log(`📁 Found ${files.length} files to upload from: ${sourceDir}`);
  }

  // Upload files
  const uploadedFiles: any[] = [];
  const failedFiles: any[] = [];

  for (const localFilePath of files) {
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
        insertOnly: !overwrite
      });
      const uploadToken = putPolicy.uploadToken(mac);

      // Upload file
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
  }

  let downloadResult: DownloadResult | null = null;
  let workingDir = process.cwd();

  // Download artifacts from GitHub if configured
  if (config.artifacts?.download) {
    downloadResult = await downloadGitHubArtifact(config);
    if (downloadResult) {
      workingDir = downloadResult.downloadDir;
    }
  }

  // Run post-processing script
  await runPostProcessScript(config, workingDir);

  // Upload to Qiniu
  const uploadResult = await uploadToQiniu(config, workingDir);

  return {
    downloaded: downloadResult,
    uploaded: uploadResult
  };
}