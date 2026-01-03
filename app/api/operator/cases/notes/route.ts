import { NextRequest, NextResponse } from "next/server";
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { getCurrentFirm } from '@/lib/utils';
import {
  CreateNoteRequestSchema,
  GetNotesQuerySchema,
  GetNotesResponseSchema,
  CreateNoteResponseSchema,
  NoteResponseSchema
} from '@/lib/schemas/notes';
import { ErrorEnvelopeSchema } from '@/lib/schemas/dto';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // @ts-ignore - Extended session properties from auth.d.ts
    const role = session.user.role;
    // @ts-ignore - Extended session properties from auth.d.ts
    const userOrgId = session.user.orgId;

    // Only operators and webmasters can access case notes
    if (role !== 'operator' && role !== 'webmaster') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
        { status: 403 }
      );
    }

    // Validate query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = GetNotesQuerySchema.safeParse({
      caseId: searchParams.get('caseId')
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        ErrorEnvelopeSchema.parse({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: { validationErrors: queryValidation.error.issues }
          }
        }),
        { status: 400 }
      );
    }

    const { caseId } = queryValidation.data;

    // Get current firm for filtering
    const firm = await getCurrentFirm();

    // Verify case exists and belongs to user's firm
    const caseExists = await prisma.case.findFirst({
      where: {
        id: caseId,
        firmId: firm.id
      },
      select: { id: true }
    });

    if (!caseExists) {
      return NextResponse.json(
        ErrorEnvelopeSchema.parse({
          success: false,
          error: {
            code: 'CASE_NOT_FOUND',
            message: 'Case not found or access denied'
          }
        }),
        { status: 404 }
      );
    }

    // Fetch notes with author information
    const notes = await prisma.caseNote.findMany({
      where: {
        caseId: caseId
      },
      include: {
        author: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform to response format
    const notesResponse = notes.map(note => ({
      id: note.id,
      caseId: note.caseId,
      authorId: note.authorId,
      authorName: note.author?.name || 'Unknown User',
      noteBody: note.body,
      createdAt: note.createdAt.toISOString()
    }));

    const response = GetNotesResponseSchema.parse({
      success: true,
      notes: notesResponse
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching case notes:', error);
    const errorResponse = ErrorEnvelopeSchema.parse({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch case notes'
      }
    });
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // @ts-ignore - Extended session properties from auth.d.ts
    const role = session.user.role;
    const userId = session.user.id;
    // @ts-ignore - Extended session properties from auth.d.ts
    const userOrgId = session.user.orgId;

    // Only operators and webmasters can create case notes
    if (role !== 'operator' && role !== 'webmaster') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
        { status: 403 }
      );
    }

    // Validate query parameters
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');

    if (!caseId) {
      return NextResponse.json(
        ErrorEnvelopeSchema.parse({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Case ID is required'
          }
        }),
        { status: 400 }
      );
    }

    // Validate request body
    const body = await request.json();
    const bodyValidation = CreateNoteRequestSchema.safeParse(body);

    if (!bodyValidation.success) {
      return NextResponse.json(
        ErrorEnvelopeSchema.parse({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: { validationErrors: bodyValidation.error.issues }
          }
        }),
        { status: 400 }
      );
    }

    const { noteBody } = bodyValidation.data;

    // Get current firm for filtering
    const firm = await getCurrentFirm();

    // Verify case exists and belongs to user's firm
    const caseExists = await prisma.case.findFirst({
      where: {
        id: caseId,
        firmId: firm.id
      },
      select: { id: true }
    });

    if (!caseExists) {
      return NextResponse.json(
        ErrorEnvelopeSchema.parse({
          success: false,
          error: {
            code: 'CASE_NOT_FOUND',
            message: 'Case not found or access denied'
          }
        }),
        { status: 404 }
      );
    }

    // Create the note
    const newNote = await prisma.caseNote.create({
      data: {
        caseId: caseId,
        authorId: userId,
        body: noteBody
      },
      include: {
        author: {
          select: {
            name: true
          }
        }
      }
    });

    // Transform to response format
    const noteResponse = {
      id: newNote.id,
      caseId: newNote.caseId,
      authorId: newNote.authorId,
      authorName: newNote.author?.name || 'Unknown User',
      noteBody: newNote.body,
      createdAt: newNote.createdAt.toISOString()
    };

    const response = CreateNoteResponseSchema.parse({
      success: true,
      note: noteResponse
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error creating case note:', error);
    const errorResponse = ErrorEnvelopeSchema.parse({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create case note'
      }
    });
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
