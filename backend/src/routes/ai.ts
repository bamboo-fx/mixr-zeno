import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

const aiRouter = new Hono();

// Type for Grok API response
interface GrokResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

// Message schema for chat
const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

const chatRequestSchema = z.object({
  messages: z.array(messageSchema).min(1),
  max_tokens: z.number().optional().default(1000),
  temperature: z.number().min(0).max(2).optional().default(0.7),
});

// Smart pairing suggestions request
const pairingSuggestionsSchema = z.object({
  userInterests: z.array(z.string()),
  userBio: z.string().optional(),
  potentialMatches: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      interests: z.array(z.string()),
      bio: z.string().optional(),
    })
  ),
});

// Icebreaker request
const icebreakerSchema = z.object({
  user1Interests: z.array(z.string()),
  user2Interests: z.array(z.string()),
  mixerTopic: z.string().optional(),
});

// Mixer summary request
const mixerSummarySchema = z.object({
  mixerName: z.string().optional(),
  groupNames: z.array(z.string()).optional(),
  participantCount: z.number().optional(),
  durationMinutes: z.number().optional(),
  avgRating: z.number().optional(),
  highlights: z.string().optional(),
});

// Chat completion endpoint
aiRouter.post("/chat", zValidator("json", chatRequestSchema), async (c) => {
  const body = c.req.valid("json");

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4-fast-non-reasoning",
        messages: body.messages,
        max_tokens: body.max_tokens,
        temperature: body.temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Grok API error:", error);
      return c.json({ error: "AI service unavailable" }, 500);
    }

    const data = (await response.json()) as GrokResponse;
    return c.json({
      choices: data.choices || [],
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return c.json({ error: "Failed to process AI request" }, 500);
  }
});

// Smart pairing suggestions
aiRouter.post(
  "/pairing-suggestions",
  zValidator("json", pairingSuggestionsSchema),
  async (c) => {
    const body = c.req.valid("json");

    const systemPrompt = `You are a social matchmaking assistant for a college mixer app called MIXR.
Your job is to analyze interests and suggest the best matches for group mixers.
Be concise, friendly, and focus on shared interests and potential conversation topics.
Return JSON with rankings and brief explanations.`;

    const userPrompt = `User interests: ${body.userInterests.join(", ")}
${body.userBio ? `User bio: ${body.userBio}` : ""}

Potential matches:
${body.potentialMatches
  .map(
    (m, i) =>
      `${i + 1}. ${m.name}: Interests - ${m.interests.join(", ")}${m.bio ? `. Bio: ${m.bio}` : ""}`
  )
  .join("\n")}

Rank these matches by compatibility and explain why they'd be great mixer partners. Return as JSON:
{
  "rankings": [
    { "id": "...", "score": 1-10, "reason": "brief explanation" }
  ],
  "topPick": "id of best match",
  "suggestedTopic": "conversation starter topic"
}`;

    try {
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "grok-4-fast-non-reasoning",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        return c.json({ error: "AI service unavailable" }, 500);
      }

      const data = (await response.json()) as GrokResponse;
      const content = data.choices?.[0]?.message?.content || "";

      // Try to parse JSON from response
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
          return c.json(parsed);
        }
      } catch {
        // Return raw content if JSON parsing fails
      }

      return c.json({ suggestion: content });
    } catch (error) {
      console.error("Pairing suggestions error:", error);
      return c.json({ error: "Failed to generate suggestions" }, 500);
    }
  }
);

// Generate icebreakers
aiRouter.post(
  "/icebreakers",
  zValidator("json", icebreakerSchema),
  async (c) => {
    const body = c.req.valid("json");

    const sharedInterests = body.user1Interests.filter((i) =>
      body.user2Interests.some(
        (j) => j.toLowerCase().includes(i.toLowerCase()) || i.toLowerCase().includes(j.toLowerCase())
      )
    );

    const systemPrompt = `You are a fun, Gen-Z friendly conversation starter generator for college mixers.
Generate 3 creative icebreaker questions that aren't boring or cliche.
Make them specific to shared interests when possible.
Keep them light, fun, and conversation-sparking.`;

    const userPrompt = `Generate 3 icebreakers for two people meeting at a mixer.
${sharedInterests.length > 0 ? `Shared interests: ${sharedInterests.join(", ")}` : ""}
Person 1 interests: ${body.user1Interests.join(", ")}
Person 2 interests: ${body.user2Interests.join(", ")}
${body.mixerTopic ? `Mixer theme: ${body.mixerTopic}` : ""}

Return as JSON array: ["icebreaker1", "icebreaker2", "icebreaker3"]`;

    try {
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "grok-4-fast-non-reasoning",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 300,
          temperature: 0.9,
        }),
      });

      if (!response.ok) {
        return c.json({ error: "AI service unavailable" }, 500);
      }

      const data = (await response.json()) as GrokResponse;
      const content = data.choices?.[0]?.message?.content || "";

      // Try to parse JSON array from response
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as string[];
          return c.json({ icebreakers: parsed });
        }
      } catch {
        // Fallback icebreakers
      }

      return c.json({
        icebreakers: [
          "What's the most spontaneous thing you've done this semester?",
          "If you could swap majors for a day, what would you try?",
          "What's your go-to late night study snack?",
        ],
      });
    } catch (error) {
      console.error("Icebreakers error:", error);
      return c.json({
        icebreakers: [
          "What's the most spontaneous thing you've done this semester?",
          "If you could swap majors for a day, what would you try?",
          "What's your go-to late night study snack?",
        ],
      });
    }
  }
);

// Mixer recap summary
aiRouter.post(
  "/summarize-mixer",
  zValidator("json", mixerSummarySchema),
  async (c) => {
    const body = c.req.valid("json");

    const systemPrompt = `You are a fun social media copywriter for a college mixer app.
Generate a brief, exciting recap of a mixer event.
Use Gen-Z friendly language, be playful but not cringy.
Keep it under 100 words.`;

    const userPrompt = `Create a fun recap for this mixer:
Mixer name: ${body.mixerName || "Group Mixer"}
Groups: ${body.groupNames?.join(" & ") || "Two groups"}
Participants: ${body.participantCount || "Unknown"} people
Duration: ${body.durationMinutes || "60"} minutes
Rating: ${body.avgRating ? `${body.avgRating}/10` : "Not rated yet"}
${body.highlights ? `Highlights: ${body.highlights}` : ""}

Write a fun 2-3 sentence recap.`;

    try {
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "grok-4-fast-non-reasoning",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 150,
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        return c.json({
          summary: `${body.mixerName || "The mixer"} brought together ${body.participantCount || "some"} awesome people for ${body.durationMinutes || 60} minutes of good vibes!`,
        });
      }

      const data = (await response.json()) as GrokResponse;
      const summary = data.choices?.[0]?.message?.content || "";

      return c.json({ summary: summary.trim() || `${body.mixerName || "The mixer"} was a great time!` });
    } catch (error) {
      console.error("Summarize mixer error:", error);
      return c.json({
        summary: `${body.mixerName || "The mixer"} was a great time!`,
      });
    }
  }
);

export { aiRouter };
