import { z } from 'zod';

export const funnelStageSchema = z.union([
  z.literal('top'),
  z.literal('bottom'),
]);

export const facebookTopEventTypeSchema = z.union([
  z.literal('ad.view'),
  z.literal('page.like'),
  z.literal('comment'),
  z.literal('video.view'),
]);

export const facebookBottomEventTypeSchema = z.union([
  z.literal('ad.click'),
  z.literal('form.submission'),
  z.literal('checkout.complete'),
]);

export const facebookEventTypeSchema = z.union([
  facebookTopEventTypeSchema,
  facebookBottomEventTypeSchema,
]);

export const facebookUserLocationSchema = z.object({
  country: z.string(),
  city: z.string(),
});

export const facebookUserSchema = z.object({
  userId: z.string(),
  name: z.string(),
  age: z.number(),
  gender: z.union([
    z.literal('male'),
    z.literal('female'),
    z.literal('non-binary'),
  ]),
  location: facebookUserLocationSchema,
});

export const facebookEngagementTopSchema = z.object({
  actionTime: z.string(),
  referrer: z.union([
    z.literal('newsfeed'),
    z.literal('marketplace'),
    z.literal('groups'),
  ]),
  videoId: z.string().nullable(),
});

export const facebookEngagementBottomSchema = z.object({
  adId: z.string(),
  campaignId: z.string(),
  clickPosition: z.union([
    z.literal('top_left'),
    z.literal('bottom_right'),
    z.literal('center'),
  ]),
  device: z.union([z.literal('mobile'), z.literal('desktop')]),
  browser: z.union([
    z.literal('Chrome'),
    z.literal('Firefox'),
    z.literal('Safari'),
  ]),
  purchaseAmount: z.string().nullable(),
});

export const facebookEngagementSchema = z.union([
  facebookEngagementTopSchema,
  facebookEngagementBottomSchema,
]);

export const facebookEventSchema = z.object({
  eventId: z.string(),
  timestamp: z.string(),
  source: z.literal('facebook'),
  funnelStage: funnelStageSchema,
  eventType: facebookEventTypeSchema,
  data: z.object({
    user: facebookUserSchema,
    engagement: facebookEngagementSchema,
  }),
});

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
  data: z.object({
    user: tiktokUserSchema,
    engagement: tiktokEngagementSchema,
  }),
});

export const eventSchema = z.union([facebookEventSchema, tiktokEventSchema]);
