import { auth, currentUser } from "@clerk/nextjs/server";
import { streamChat, type Message } from "@/agents/terminal";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_INPUT_CHARS = 500;
const DAILY_FREE_LIMIT = 20;

export async function POST(req: Request) {
  // Auth — require signed-in user
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pro users get unlimited scans — check Clerk public metadata
  const user = await currentUser();
  const isPro = user?.publicMetadata?.plan === "pro";

  // Usage limit — 20 /check scans per day (free tier only)
  if (!isPro) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const usedToday = await prisma.tokenAnalysis.count({
      where: { userId, checkedAt: { gte: today } },
    });
    if (usedToday >= DAILY_FREE_LIMIT) {
      return Response.json(
        {
          error: `Daily limit reached (${DAILY_FREE_LIMIT}/${DAILY_FREE_LIMIT} scans). Resets at midnight UTC.`,
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
