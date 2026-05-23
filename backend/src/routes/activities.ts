import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db.js";

const activitiesRouter = new Hono();

// GET / — list all activities (optional ?category= filter)
activitiesRouter.get("/", async (c) => {
  try {
    const category = c.req.query("category");
    const activities = await db.activity.findMany({
      where: category ? { category } : undefined,
      orderBy: { name: "asc" },
    });
    return c.json({ activities });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch activities" }, 500);
  }
});

// GET /:id — get activity by id
activitiesRouter.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const activity = await db.activity.findUnique({ where: { id } });
    if (!activity) return c.json({ error: "Activity not found" }, 404);
    return c.json({ activity });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch activity" }, 500);
  }
});

export { activitiesRouter };
