import { OpenAPIV3 } from 'openapi-types';
import {
  IntakeSubmitRequestSchema,
  IntakeSubmitResponseSchema,
} from '@/lib/schemas/intake';
import {
  InviteValidateRequestSchema,
  InviteValidateResponseSchema,
  InviteCreateRequestSchema,
  InviteCreateResponseSchema,
} from '@/lib/schemas/invite';
import {
  SignupRequestSchema,
  SignupResponseSchema,
} from '@/lib/schemas/signup';
import {
  BookingSlotsResponseSchema,
  BookingCreateRequestSchema,
  BookingCreateResponseSchema,
  BookingConfirmationResponseSchema,
} from '@/lib/schemas/booking';
import { ErrorEnvelopeSchema } from '@/lib/schemas/dto';

// ============================================================================
// OPENAPI 3.0 SPECIFICATION
// ============================================================================

export const openApiSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'Law Firm Intake + Operator Dashboard API',
    version: '1.0.0',
    description: 'Single-tenant law firm intake system with operator dashboard and Stripe billing',
    contact: {
      name: 'Development Team',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  security: [
    {
      bearerAuth: [],
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      // Shared schemas
      ErrorEnvelope: {
        type: 'object',
        required: ['success', 'error'],
        properties: {
          success: { type: 'boolean', enum: [false] },
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'object' },
            },
          },
        },
      },
      ContactInfo: {
        type: 'object',
        required: ['firstName', 'lastName', 'email', 'phone'],
        properties: {
          firstName: { type: 'string', minLength: 1 },
          lastName: { type: 'string', minLength: 1 },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', minLength: 10 },
        },
      },
    },
  },
  paths: {
    // ============================================================================
    // PUBLIC INTAKE + BOOKING
    // ============================================================================

    '/api/intake/submit': {
      post: {
        summary: 'Submit intake form and create lead',
        description: 'Creates a new lead from public intake form. Validates for duplicate active cases/leads.',
        tags: ['Public Intake'],
        security: [], // Public endpoint
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['contact', 'intakePayload'],
                properties: {
                  leadType: {
                    type: 'string',
                    enum: ['DEBT_SETTLEMENT', 'BANKRUPTCY'],
                  },
                  contact: { $ref: '#/components/schemas/ContactInfo' },
                  intakePayload: {
                    type: 'object',
                    description: 'Versioned JSON blob containing intake form data',
                  },
                  debtAmount: {
                    type: 'integer',
                    minimum: 0,
                    description: 'Debt amount from dropdown',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Lead created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'leadId', 'leadStatus'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    leadId: { type: 'string', format: 'uuid' },
                    leadStatus: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } },
            },
          },
          '409': {
            description: 'Duplicate intake - active case or lead exists',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } },
            },
          },
        },
      },
    },

    '/api/public/booking/slots': {
      get: {
        summary: 'Get available booking time slots',
        description: 'Returns available 30-minute consultation slots based on firm calendar, operator availability, and existing bookings.',
        tags: ['Public Booking'],
        security: [], // Public endpoint
        parameters: [
          {
            name: 'start',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            description: 'Start date in YYYY-MM-DD format',
          },
          {
            name: 'days',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 30, default: 14 },
            description: 'Number of days to check (default: 14)',
          },
        ],
        responses: {
          '200': {
            description: 'Available slots returned',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'availability'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    availability: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['date', 'slots', 'availableCount'],
                        properties: {
                          date: { type: 'string', format: 'date' },
                          slots: {
                            type: 'array',
                            items: {
                              type: 'object',
                              required: ['start', 'end', 'available'],
                              properties: {
                                start: { type: 'string', format: 'date-time' },
                                end: { type: 'string', format: 'date-time' },
                                available: { type: 'boolean' },
                              },
                            },
                          },
                          availableCount: { type: 'integer', minimum: 0 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/public/booking/create': {
      post: {
        summary: 'Create a consultation booking',
        description: 'Creates a 30-minute consultation booking for an existing lead. Requires valid lead ID and available time slot.',
        tags: ['Public Booking'],
        security: [], // Public endpoint
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['leadId', 'startAt', 'endAt'],
                properties: {
                  leadId: { type: 'string', format: 'uuid' },
                  startAt: { type: 'string', format: 'date-time' },
                  endAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Booking created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'bookingId', 'startAt', 'endAt', 'status'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    bookingId: { type: 'string', format: 'uuid' },
                    startAt: { type: 'string', format: 'date-time' },
                    endAt: { type: 'string', format: 'date-time' },
                    status: { type: 'string' },
                  },
                },
              },
            },
          },
          '409': {
            description: 'Time slot no longer available',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } },
            },
          },
        },
      },
    },

    '/api/public/booking/{bookingId}': {
      get: {
        summary: 'Get booking confirmation details',
        description: 'Retrieves booking details for confirmation page display.',
        tags: ['Public Booking'],
        security: [], // Public endpoint
        parameters: [
          {
            name: 'bookingId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Booking details returned',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'bookingId', 'leadId', 'startAt', 'endAt', 'status'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    bookingId: { type: 'string', format: 'uuid' },
                    leadId: { type: 'string', format: 'uuid' },
                    startAt: { type: 'string', format: 'date-time' },
                    endAt: { type: 'string', format: 'date-time' },
                    status: { type: 'string' },
                    confirmedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ============================================================================
    // AUTH + INVITATIONS
    // ============================================================================

    '/api/auth/invite/validate': {
      post: {
        summary: 'Validate operator invite code',
        description: 'Validates an invite code and returns role information if valid.',
        tags: ['Authentication'],
        security: [], // Public endpoint
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'code'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  code: { type: 'string', minLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Invite validation result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'valid'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    valid: { type: 'boolean' },
                    role: { type: 'string', enum: ['WEBMASTER', 'OPERATOR', 'CLIENT'] },
                    expiresAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/auth/signup': {
      post: {
        summary: 'Create operator account',
        description: 'Creates a new operator account using a valid invite code.',
        tags: ['Authentication'],
        security: [], // Public endpoint
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name', 'code'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  name: { type: 'string', minLength: 1 },
                  code: { type: 'string', minLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Account created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'userId'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    userId: { type: 'string', format: 'uuid' },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/webmaster/invites/create': {
      post: {
        summary: 'Create operator invite code',
        description: 'Creates a new invite code for an operator to join the firm.',
        tags: ['Webmaster', 'Invitations'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'role'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  role: { type: 'string', enum: ['OPERATOR'] },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Invite created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'inviteId', 'code'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    inviteId: { type: 'string', format: 'uuid' },
                    code: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generates an OpenAPI spec as JSON
 */
export function generateOpenAPISpec(): string {
  return JSON.stringify(openApiSpec, null, 2);
}

/**
 * Generates a basic HTML documentation page
 */
export function generateOpenAPIHTML(): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Law Firm Intake API Documentation</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui.css" />
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-bundle.js"></script>
    <script>
        window.onload = () => {
            window.ui = SwaggerUIBundle({
                spec: ${JSON.stringify(openApiSpec)},
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIBundle.SwaggerUIStandalonePreset
                ],
            });
        };
    </script>
</body>
</html>`;
}




