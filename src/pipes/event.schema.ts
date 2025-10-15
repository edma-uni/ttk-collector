import { z } from 'zod';

// === TikTok Event Schemas ===
export const funnelStageSchema = z.union([
  z.literal('top'),
  z.literal('bottom'),
]);

export const tiktokTopEventTypeSchema = z.union([
  z.literal('video.view'),
  z.literal('like'),
  z.literal('share'),
  z.literal('comment'),
]);

export const tiktokBottomEventTypeSchema = z.union([
  z.literal('profile.visit'),
  z.literal('purchase'),
  z.literal('follow'),
]);

export const tiktokEventTypeSchema = z.union([
  tiktokTopEventTypeSchema,
  tiktokBottomEventTypeSchema,
]);

export const tiktokUserSchema = z.object({
  userId: z.string(),
  username: z.string(),
  followers: z.number(),
});

export const tiktokEngagementTopSchema = z.object({
  watchTime: z.number(),
  percentageWatched: z.number(),
  device: z.union([
    z.literal('Android'),
    z.literal('iOS'),
    z.literal('Desktop'),
  ]),
  country: z.string(),
  videoId: z.string(),
});

export const tiktokEngagementBottomSchema = z.object({
  actionTime: z.string(),
  profileId: z.string().nullable(),
  purchasedItem: z.string().nullable(),
  purchaseAmount: z.string().nullable(),
});

export const tiktokEngagementSchema = z.union([
  tiktokEngagementTopSchema,
  tiktokEngagementBottomSchema,
]);

export const tiktokEventSchema = z.object({
  eventId: z.string(),
  timestamp: z.string(),
  source: z.literal('tiktok'),
  funnelStage: funnelStageSchema,
  eventType: tiktokEventTypeSchema,
  correlationId: z.string().optional(), // For tracing across services
  data: z.object({
    user: tiktokUserSchema,
    engagement: tiktokEngagementSchema,
  }),
});

export const eventSchema = tiktokEventSchema;
