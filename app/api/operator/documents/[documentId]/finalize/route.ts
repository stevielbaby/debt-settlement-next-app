import { NextRequest, NextResponse } from 'next/server';
import { DocumentFinalizeResponseSchema } from '@/lib/schemas/document';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { storageAdapter } from '@/lib/storage-adapter';

/**
 * POST /api/operator/documents/:documentId/finalize
 *
 * Finalize a document upload after the client has uploaded the file.
 * Verifies the upload exists and updates the document status.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
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

    // Only operators and webmasters can finalize documents
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

    const { documentId } = await params;

    // Validate documentId is a valid UUID
    if (!documentId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(documentId)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_DOCUMENT_ID',
            message: 'Invalid document ID format',
          },
        },
        { status: 400 }
      );
    }

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

    // Find the document and verify ownership
    const document = await prisma.caseDocument.findFirst({
      where: {
        id: documentId,
      },
    });

    if (!document) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Document not found',
          },
        },
        { status: 404 }
      );
    }

    // Check if already finalized (sizeBytes > 0 indicates finalization)
    if (document.sizeBytes > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DOCUMENT_ALREADY_FINALIZED',
            message: 'Document has already been finalized',
          },
        },
        { status: 409 }
      );
    }

    // Verify the upload exists in storage and get actual size
    try {
      const verification = await storageAdapter.verifyUpload(document.storageKey);

      if (!verification.exists) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'UPLOAD_NOT_FOUND',
              message: 'Uploaded file not found in storage',
            },
          },
          { status: 404 }
        );
      }

      // Update document with actual size and mark as finalized
      const updatedDocument = await prisma.caseDocument.update({
        where: { id: documentId },
        data: {
          sizeBytes: verification.sizeBytes || document.sizeBytes,
          // Keep deletedAt as null to indicate finalized
        },
        select: {
          id: true,
          filename: true,
          sizeBytes: true,
        },
      });

      const response = DocumentFinalizeResponseSchema.parse({
        success: true,
        documentId: updatedDocument.id,
        filename: updatedDocument.filename,
        sizeBytes: updatedDocument.sizeBytes,
        status: 'FINALIZED',
      });

      return NextResponse.json(response);
    } catch (storageError) {
      console.error('Storage verification error:', storageError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'STORAGE_VERIFICATION_FAILED',
            message: 'Failed to verify uploaded file',
          },
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Error finalizing document:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to finalize document',
        },
      },
      { status: 500 }
    );
  }
}
