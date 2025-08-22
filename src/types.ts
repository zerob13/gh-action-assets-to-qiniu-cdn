export interface QiniuConfig {
  accessKey: string;
  secretKey: string;
  bucket: string;
  zone?: 'z0' | 'z1' | 'z2' | 'na0' | 'as0';
}

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  runId?: number;
  artifactName?: string;
}

export interface ArtifactsConfig {
  download?: boolean;
  downloadDir?: string;
  patterns?: string[];
  pathMapping?: Record<string, string>;
}

export interface UploadConfig {
  cdnBasePath?: string;
  overwrite?: boolean;
  cleanupAfterUpload?: boolean;
}

export interface ProcessingConfig {
  postProcessScript?: string;
  workingDirectory?: string;
}

export interface OptionsConfig {
  verbose?: boolean;
  maxRetries?: number;
  timeout?: number;
}

export interface AppConfig {
  version?: string;
  qiniu: QiniuConfig;
  github?: GitHubConfig;
  artifacts?: ArtifactsConfig;
  upload?: UploadConfig;
  processing?: ProcessingConfig;
  options?: OptionsConfig;
}

export interface DownloadedFile {
  name: string;
  path: string;
  createdAt?: string;
}

export interface DownloadResult {
  count: number;
  files: DownloadedFile[];
  downloadDir: string;
}

export interface UploadedFile {
  local: string;
  remote: string;
  key: string;
  hash: string;
  size: number;
}

export interface FailedFile {
  local: string;
  remote: string;
  error: string;
}

export interface UploadResult {
  totalCount: number;
  successCount: number;
  failedCount: number;
  files: UploadedFile[];
  failedFiles: FailedFile[];
}

export interface ProcessResult {
  downloaded?: DownloadResult | undefined;
  uploaded: UploadResult;
}