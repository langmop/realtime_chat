import { redis } from "@/lib/redis";
import { Elysia, t } from "elysia";
import { nanoid } from "nanoid";
import { authMiddleware } from "./auth";
import z from "zod";
import { Message, realtime } from "@/lib/realtime";

const TIME_TO_LIVE = 60 * 10;

export const rooms = new Elysia({
  prefix: "/room",
})
  .post("/create", async () => {
    const roomId = nanoid();
    const redisId = `meta:${roomId}`;
    await redis.hset(redisId, {
      connected: [],
      createdAt: Date.now(),
    });

    await redis.expire(redisId, TIME_TO_LIVE);

    return {
      roomId,
    };
  })
  .use(authMiddleware)
  .get(
    "/ttl",
    async ({ auth }) => {
      const ttl = await redis.ttl(`meta:${auth.roomId}`);
      return {
        ttl: ttl > 0 ? ttl : 0,
      };
    },
    {
      query: z.object({
        roomId: z.string(),
      }),
    }
  )
  .delete(
    "/",
    async ({ auth }) => {
      await realtime.channel(auth.roomId).emit("destroy.isDestroyed", true);
      await Promise.all([
        await redis.del(auth.roomId),
        await redis.del(`meta:${auth.roomId}`),
        await redis.del(`messages:${auth.roomId}`),
      ]);
    },
    {
      query: z.object({
        roomId: z.string(),
      }),
    }
  );


const messages = new Elysia({
  prefix: "/messages",
})
  .use(authMiddleware)
  .post(
    "/",
    async ({ auth, body }) => {
      const { sender, text } = body;
      const { roomId } = auth;
      const roomExist = await redis.exists(`meta:${roomId}`);

      if (!roomExist) throw new Error("Room does not exist");

      const message: Message = {
        id: nanoid(),
        sender,
        text,
        timestamp: Date.now(),
        roomId,
      };

      await redis.rpush(`messages:${roomId}`, {
        ...message,
        token: auth.token,
      });

      await realtime.channel(roomId).emit("chat.message", message);

      const remaining = await redis.ttl(`meta:${roomId}`);
      await Promise.all([
        await redis.expire(`messages:${roomId}`, remaining),
        await redis.expire(`history:${roomId}`, remaining),
        await redis.expire(roomId, remaining),
      ]);
    },
    {
      query: z.object({
        roomId: z.string(),
      }),
      body: z.object({
        sender: z.string().max(100),
        text: z.string().max(1000),
      }),
    }
  )
  .get(
    "/",
    async ({ auth }) => {
      const messages = await redis.lrange<Message>(
        `messages:${auth.roomId}`,
        0,
        -1
      );
      return {
        messages: messages.map((m) => ({
          ...m,
          token: m.token === auth.token ? auth.token : undefined,
        })),
      };
    },
    {
      query: z.object({
        roomId: z.string(),
      }),
    }
  );

export const App = new Elysia({ prefix: "/api" })
  .use(rooms)
  .use(messages)
  .get("/", "Hello Nextjs")
  .post("/", ({ body }) => body, {
    body: t.Object({
      name: t.String(),
    }),
  });

export const GET = App.fetch;
export const POST = App.fetch;
export const DELETE = App.fetch;
