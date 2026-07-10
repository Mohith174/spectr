import { streamChat, type Message } from "@/agents/terminal";
import { prisma } from "@/lib/db";
import { getEffectiveUser, isDemoMode } from "@/lib/demo-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_INPUT_CHARS = 500;
const DAILY_FREE_LIMIT = 20;
const DEMO_SHARED_DAILY_LIMIT = 100;

export async function POST(req: Request) {
  const { userId, isPro } = await getEffectiveUser();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Usage limit — shared pool in demo mode, per-user free tier otherwise
  if (!isPro) {
    const limit = isDemoMode ? DEMO_SHARED_DAILY_LIMIT : DAILY_FREE_LIMIT;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const usedToday = await prisma.tokenAnalysis.count({
      where: { userId, checkedAt: { gte: today } },
    });
    if (usedToday >= limit) {
      return Response.json(
        {
          error: isDemoMode
            ? `This public demo hit its shared daily limit (${limit} scans). Try again after midnight UTC.`
            : `Daily limit reached (${limit}/${limit} scans). Resets at midnight UTC.`,
          upgrade: true,
        },
        { status: 429 }
      );
    }
  }

  const { messages }: { messages: Message[] } = await req.json();

  // Enforce input length
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (lastUser && lastUser.content.length > MAX_INPUT_CHARS) {
    return Response.json(
      { error: `Input too long — max ${MAX_INPUT_CHARS} characters.` },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      await streamChat(
        messages,
        {
          onToken: (token) => {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "token", content: token })}\n\n`
              )
            );
          },
          onToolCall: (toolName, args) => {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "tool_call", tool: toolName, args })}\n\n`
              )
            );
          },
          onToolResult: (toolName, result) => {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "tool_result", tool: toolName, result })}\n\n`
              )
            );
          },
          onComplete: () => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
            );
            controller.close();
          },
          onError: (error) => {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`
              )
            );
            controller.close();
          },
        },
        { userId }
      );
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
