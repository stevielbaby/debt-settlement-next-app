import { z } from 'zod';
import { SuccessEnvelopeSchema, ErrorEnvelopeSchema } from './dto';

// ============================================================================
// DOCUMENT UPLOAD URL ENDPOINT (/api/operator/cases/:caseId/documents/upload-url)
// ============================================================================

// Request schema for document upload URL generation
export const DocumentUploadUrlRequestSchema = z.object({
  filename: z.string().min(1, 'Filename required'),
  contentType: z.string().regex(
    /^(application\/pdf|image\/(jpeg|jpg|png))$/i,
    'Only PDF, JPEG, and PNG files are allowed'
  ),
  contentLength: z.number().int().min(1).max(5 * 1024 * 1024, 'File size must not exceed 5MB'),
});

// Response schema for upload URL generation
export const DocumentUploadUrlResponseSchema = SuccessEnvelopeSchema.extend({
  documentId: z.string().uuid(),
  uploadUrl: z.string().url(),
  uploadMethod: z.enum(['PUT', 'POST']),
  uploadFields: z.record(z.string(), z.string()).optional(), // For POST uploads
  storageKey: z.string(),
});

// ============================================================================
// DOCUMENT FINALIZE ENDPOINT (/api/operator/documents/:documentId/finalize)
// ============================================================================

// Response schema for document finalization
export const DocumentFinalizeResponseSchema = SuccessEnvelopeSchema.extend({
  documentId: z.string().uuid(),
  filename: z.string(),
  sizeBytes: z.number().int(),
  status: z.literal('FINALIZED'),
});

// ============================================================================
// LIST CASE DOCUMENTS ENDPOINT (/api/operator/cases/:caseId/documents)
// ============================================================================

// Individual document schema for listing
const DocumentListItemSchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int(),
  uploadedBy: z.string().optional(),
  createdAt: z.string().datetime(),
  storageKey: z.string(),
});

// Response schema for listing case documents
export const CaseDocumentsResponseSchema = SuccessEnvelopeSchema.extend({
  documents: z.array(DocumentListItemSchema),
  total: z.number().int(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type DocumentUploadUrlRequest = z.infer<typeof DocumentUploadUrlRequestSchema>;
export type DocumentUploadUrlResponse = z.infer<typeof DocumentUploadUrlResponseSchema>;
export type DocumentFinalizeResponse = z.infer<typeof DocumentFinalizeResponseSchema>;
export type CaseDocumentsResponse = z.infer<typeof CaseDocumentsResponseSchema>;
