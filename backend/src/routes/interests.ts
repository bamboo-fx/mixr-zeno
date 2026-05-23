import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db.js";

const interestsRouter = new Hono();

// GET / — list all interests
interestsRouter.get("/", async (c) => {
  try {
    const interests = await db.interest.findMany({ orderBy: { name: "asc" } });
    return c.json({ interests });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch interests" }, 500);
  }
});

// POST / — create a custom interest
const createInterestSchema = z.object({
  name: z.string().min(1).max(50).trim(),
});

interestsRouter.post(
  "/",
  zValidator("json", createInterestSchema),
  async (c) => {
    try {
      const { name } = c.req.valid("json");

      // Check if interest already exists (case-insensitive for SQLite)
      const allInterests = await db.interest.findMany();
      const existing = allInterests.find(
        (i) => i.name.toLowerCase() === name.toLowerCase()
      );

      if (existing) {
        return c.json({ interest: existing });
      }

      // Create new interest
      const interest = await db.interest.create({
        data: { name },
      });

      return c.json({ interest }, 201);
    } catch (err) {
      console.error(err);
      return c.json({ error: "Failed to create interest" }, 500);
    }
  }
);

export { interestsRouter };
