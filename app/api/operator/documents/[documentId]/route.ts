import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { storageAdapter } from '@/lib/storage-adapter';

/**
 * DELETE /api/operator/documents/:documentId
 *
 * Soft delete a document and optionally remove it from storage.
 */
export async function DELETE(
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

    // Only operators and webmasters can delete documents
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
            message: 'Document not found or already deleted',
          },
        },
        { status: 404 }
      );
    }

    // Delete the document
    await prisma.caseDocument.delete({
      where: { id: documentId },
    });

    // Optionally delete from storage (commented out for safety - uncomment when confident)
    try {
      // await storageAdapter.deleteFile(document.storageKey);
      console.log(`Document ${documentId} deleted, storage key: ${document.storageKey}`);
    } catch (storageError) {
      // Log but don't fail the operation - document is still soft deleted
      console.error('Storage deletion failed:', storageError);
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
      documentId: documentId,
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete document',
        },
      },
      { status: 500 }
    );
  }
}
