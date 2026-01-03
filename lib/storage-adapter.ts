/**
 * Storage Adapter Interface
 *
 * Abstracts file storage operations to allow switching providers (S3, R2, Vercel Blob, etc.)
 * Currently implements a placeholder that can be replaced with actual provider logic.
 */

export interface UploadUrlRequest {
  key: string;
  contentType: string;
  contentLength: number;
  expiresIn?: number; // seconds
}

export interface UploadUrlResponse {
  url: string; // The URL to upload to
  fields?: Record<string, string>; // Additional form fields for POST uploads
  method: 'PUT' | 'POST';
}

export interface StorageAdapter {
  /**
   * Generate an upload URL for direct client upload
   */
  generateUploadUrl(request: UploadUrlRequest): Promise<UploadUrlResponse>;

  /**
   * Verify that an uploaded file exists and get its actual size
   */
  verifyUpload(key: string): Promise<{ exists: boolean; sizeBytes?: number }>;

  /**
   * Delete a file from storage
   */
  deleteFile(key: string): Promise<void>;

  /**
   * Get the base URL for accessing files (if applicable)
   */
  getFileUrl?(key: string): string;
}

/**
 * Placeholder implementation - replace with actual storage provider
 */
export class PlaceholderStorageAdapter implements StorageAdapter {
  async generateUploadUrl(request: UploadUrlRequest): Promise<UploadUrlResponse> {
    // TODO: Replace with actual storage provider (S3, R2, Vercel Blob, etc.)

    // For now, return a placeholder that indicates this needs implementation
    throw new Error('Storage provider not implemented. Configure S3, R2, or Vercel Blob.');

    // Example S3 implementation:
    /*
    const s3 = new S3Client({ region: process.env.AWS_REGION });
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: request.key,
      ContentType: request.contentType,
      ContentLength: request.contentLength,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: request.expiresIn || 3600 });

    return {
      url: signedUrl,
      method: 'PUT',
    };
    */
  }

  async verifyUpload(key: string): Promise<{ exists: boolean; sizeBytes?: number }> {
    // TODO: Implement file verification
    // For now, assume file exists with expected size
    return { exists: true, sizeBytes: 0 };
  }

  async deleteFile(key: string): Promise<void> {
    // TODO: Implement file deletion
    console.log(`Placeholder: Would delete file ${key}`);
  }
}

// Export a singleton instance
export const storageAdapter = new PlaceholderStorageAdapter();


