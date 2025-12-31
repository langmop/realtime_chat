// message, destroy

import z from "zod";
import { redis } from "./redis";
import { InferRealtimeEvents, Realtime } from "@upstash/realtime";


const message = z.object({
    id: z.string(),
    sender: z.string(),
    text: z.string(),
    timestamp: z.number(),
    roomId: z.string(),
    token: z.string().optional(),
  })

const schema = {
  chat: {
    message: message,
  },
  destroy: {
    isDestroyed: z.literal(true),
  },
};

export const realtime = new Realtime({
  schema,
  redis,
});
export type RealTimeEvents = InferRealtimeEvents<typeof realtime>;
export type Message = z.infer<typeof message>