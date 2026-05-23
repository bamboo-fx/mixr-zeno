import { Hono } from "hono";
import { db } from "../db.js";

const collegesRouter = new Hono();

// GET / — list all colleges
collegesRouter.get("/", async (c) => {
  try {
    const colleges = await db.college.findMany({
      orderBy: { name: "asc" },
    });
    return c.json({ colleges });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch colleges" }, 500);
  }
});

// GET /:id — get college by id
collegesRouter.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const college = await db.college.findUnique({ where: { id } });
    if (!college) return c.json({ error: "College not found" }, 404);
    return c.json({ college });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to fetch college" }, 500);
  }
});

export { collegesRouter };
