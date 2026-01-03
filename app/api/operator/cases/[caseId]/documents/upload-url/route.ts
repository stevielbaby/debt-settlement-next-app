import { NextRequest, NextResponse } from 'next/server';
import { DocumentUploadUrlRequestSchema, DocumentUploadUrlResponseSchema } from '@/lib/schemas/document';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { storageAdapter } from '@/lib/storage-adapter';
import { randomUUID } from 'crypto';

/**
 * POST /api/operator/cases/:caseId/documents/upload-url
 *
 * Generate an upload URL for a new document.
 * Creates the CaseDocument record first, then returns upload instructions.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        },
        { status: 401 }
      );
    }

    // @ts-ignore - Extended session properties from auth.d.ts
    const role = session.user.role;
    // @ts-ignore - Extended session properties from auth.d.ts
    const userId = session.user.id;

    // Only operators and webmasters can upload documents
    if (role !== 'operator' && role !== 'webmaster') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions'
          }
        },
        { status: 403 }
      );
    }

    const { caseId } = await params;

    // Validate caseId is a valid UUID
    if (!caseId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(caseId)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CASE_ID',
            message: 'Invalid case ID format',
          },
        },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = DocumentUploadUrlRequestSchema.parse(body);

    // Get the current firm
    const firm = await prisma.firm.findFirst();
    if (!firm) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FIRM_NOT_CONFIGURED',
            message: 'Firm not configured',
          },
        },
        { status: 500 }
      );
    }

    // Verify case exists and belongs to this firm
    const caseRecord = await prisma.case.findFirst({
      where: {
        id: caseId,
        firmId: firm.id,
      },
    });

    if (!caseRecord) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CASE_NOT_FOUND',
            message: 'Case not found',
          },
        },
        { status: 404 }
      );
    }

    // Generate unique document ID and storage key
    const documentId = randomUUID();
    const storageKey = `documents/${firm.id}/${caseId}/${documentId}/${validatedData.filename}`;

    // Create the document record first (before upload)
    const document = await prisma.caseDocument.create({
      data: {
        id: documentId,
        caseId: caseId,
        filename: validatedData.filename,
        mimeType: validatedData.contentType,
        sizeBytes: validatedData.contentLength, // Will be verified during finalize
        storageKey: storageKey,
      },
    });

    // Generate upload URL
    try {
      const uploadInstructions = await storageAdapter.generateUploadUrl({
        key: storageKey,
        contentType: validatedData.contentType,
        contentLength: validatedData.contentLength,
        expiresIn: 3600, // 1 hour
      });

      const response = DocumentUploadUrlResponseSchema.parse({
        success: true,
        documentId: document.id,
        uploadUrl: uploadInstructions.url,
        uploadMethod: uploadInstructions.method,
        uploadFields: uploadInstructions.fields,
        storageKey: storageKey,
      });

      return NextResponse.json(response);
    } catch (storageError) {
      // If storage URL generation fails, clean up the document record
      await prisma.caseDocument.delete({
        where: { id: documentId },
      });

      console.error('Storage adapter error:', storageError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'STORAGE_ERROR',
            message: 'Failed to generate upload URL. Storage provider may not be configured.',
          },
        },
        { status: 503 }
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Storage provider not implemented')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'STORAGE_NOT_CONFIGURED',
            message: 'File storage is not configured. Please set up S3, R2, or Vercel Blob.',
          },
        },
        { status: 503 }
      );
    }

    console.error('Error generating upload URL:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate upload URL',
        },
      },
      { status: 500 }
    );
  }
}
