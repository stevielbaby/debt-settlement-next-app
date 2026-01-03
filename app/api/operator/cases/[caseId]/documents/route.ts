import { NextRequest, NextResponse } from 'next/server';
import { CaseDocumentsResponseSchema } from '@/lib/schemas/document';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';

/**
 * GET /api/operator/cases/:caseId/documents
 *
 * List all non-deleted documents for a case.
 */
export async function GET(
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

    // Only operators and webmasters can view documents
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

    // Get all documents for this case
    const documents = await prisma.caseDocument.findMany({
      where: {
        caseId: caseId,
        sizeBytes: { gt: 0 }, // Only finalized documents (have actual size)
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
        storageKey: true,
      },
    });

    // Format response
    const formattedDocuments = documents.map(doc => ({
      id: doc.id,
      filename: doc.filename,
      contentType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      createdAt: doc.createdAt.toISOString(),
      storageKey: doc.storageKey,
    }));

    const response = CaseDocumentsResponseSchema.parse({
      success: true,
      documents: formattedDocuments,
      total: formattedDocuments.length,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error listing case documents:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list case documents',
        },
      },
      { status: 500 }
    );
  }
}
