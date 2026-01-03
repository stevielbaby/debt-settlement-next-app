import { z } from 'zod';

// Organization schemas
export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  type: z.string().optional(),
  isSingleton: z.boolean().optional(),
  status: z.string(),
  subscription_status: z.string().optional(),
  plan_name: z.string().optional(),
  createdAt: z.string().optional(),
}).passthrough(); // Allow additional fields

export const OrganizationsResponseSchema = z.object({
  success: z.boolean(),
  mode: z.string(),
  organizations: z.array(OrganizationSchema),
  capabilities: z.object({
    canCreate: z.boolean(),
    canEdit: z.boolean(),
    canDelete: z.boolean(),
    canProvision: z.boolean(),
  }).passthrough(),
  message: z.string().optional(),
}).passthrough();

// Billing schemas
export const BillingMetricsSchema = z.object({
  totalRevenue: z.number(),
  monthlyRecurringRevenue: z.number(),
  averageContractValue: z.number(),
  churnRate: z.number(),
  paymentsProcessed: z.number(),
  paymentsOverdue: z.number(),
}).passthrough();

export const SubscriptionSchema = z.object({
  id: z.string(),
  stripeSubscriptionId: z.string(), // ✅ ADD THIS - needed for cancellation
  organization_name: z.string(),
  plan_name: z.string(),
  amount: z.number(),
  status: z.string(),
  current_period_start: z.string().optional(),
  current_period_end: z.string().optional(),
  cancel_at_period_end: z.boolean(),
}).passthrough();

export const InvoiceSchema = z.object({
  id: z.string(),
  organization_name: z.string(),
  amount: z.number(),
  status: z.string(),
  issue_date: z.string(),
  due_date: z.string().optional(),
  paid_date: z.string().optional(),
}).passthrough();

export const BillingResponseSchema = z.object({
  success: z.boolean(),
  metrics: BillingMetricsSchema,
  invoices: z.array(InvoiceSchema),
  subscriptions: z.array(SubscriptionSchema),
}).passthrough();

// Usage schemas
export const UsageMetricsSchema = z.object({
  cases: z.object({
    total: z.number(),
    active: z.number(),
    closed: z.number(),
  }),
  documents: z.object({
    total: z.number(),
    totalSizeBytes: z.number(),
    averageSizeBytes: z.number(),
  }),
  users: z.object({
    total: z.number(),
    active: z.number(),
  }),
  leads: z.object({
    total: z.number(),
    converted: z.number(),
  }),
});

export const UsageMetricSchema = z.object({
  organization_name: z.string(),
  metric_name: z.string(),
  current_month_count: z.number(),
  monthly_limit: z.number(),
  usage_percentage: z.number(),
}).passthrough();

export const UsageStatsSchema = z.object({
  cases: z.object({
    total: z.number(),
    active: z.number(),
    closed: z.number(),
  }).passthrough(),
  documents: z.object({
    total: z.number(),
    totalSizeBytes: z.number(),
    averageSizeBytes: z.number(),
  }).passthrough(),
  users: z.object({
    total: z.number(),
    active: z.number(),
  }).passthrough(),
  leads: z.object({
    total: z.number(),
    converted: z.number(),
  }).passthrough(),
  total_usage: z.number(),
}).passthrough();

export const UsageResponseSchema = z.object({
  success: z.boolean(),
  metrics: z.array(UsageMetricSchema),
  stats: UsageStatsSchema,
}).passthrough();

// Type exports
export type Organization = z.infer<typeof OrganizationSchema>;
export type OrganizationsResponse = z.infer<typeof OrganizationsResponseSchema>;
export type BillingMetrics = z.infer<typeof BillingMetricsSchema>;
export type Subscription = z.infer<typeof SubscriptionSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type BillingResponse = z.infer<typeof BillingResponseSchema>;
export type UsageMetric = z.infer<typeof UsageMetricSchema>;
export type UsageMetrics = z.infer<typeof UsageMetricsSchema>;
export type UsageResponse = z.infer<typeof UsageResponseSchema>;
