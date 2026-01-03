import { z } from 'zod';
import { SuccessEnvelopeSchema, ErrorEnvelopeSchema } from './dto';

// ============================================================================
// NOTES API SCHEMAS
// ============================================================================

// Request schema for creating a note
export const CreateNoteRequestSchema = z.object({
  noteBody: z.string().min(1, 'Note body is required').max(1000, 'Note body too long'),
});

// Request schema for fetching notes (query parameters)
export const GetNotesQuerySchema = z.object({
  caseId: z.string().min(1, 'Case ID is required'),
});

// Response schema for a single note
export const NoteResponseSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  authorId: z.string().nullable(),
  authorName: z.string(), // Populated from User model
  noteBody: z.string(),
  createdAt: z.string().datetime(),
});

// Response schema for notes list
export const GetNotesResponseSchema = SuccessEnvelopeSchema.extend({
  notes: z.array(NoteResponseSchema),
});

// Response schema for note creation
export const CreateNoteResponseSchema = SuccessEnvelopeSchema.extend({
  note: NoteResponseSchema,
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateNoteRequest = z.infer<typeof CreateNoteRequestSchema>;
export type GetNotesQuery = z.infer<typeof GetNotesQuerySchema>;
export type NoteResponse = z.infer<typeof NoteResponseSchema>;
export type GetNotesResponse = z.infer<typeof GetNotesResponseSchema>;
export type CreateNoteResponse = z.infer<typeof CreateNoteResponseSchema>;
