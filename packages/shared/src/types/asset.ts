export interface Asset {
  id: string;
  landingPageVersionId: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  storageUrl: string;
  uploadedAt: string;
}

export interface AssetUploadRequest {
  file: File;
}
