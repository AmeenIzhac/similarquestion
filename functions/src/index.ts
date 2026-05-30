import { onRequest } from "firebase-functions/v2/https";
import OpenAI from "openai";

export const streamIntuitive = onRequest(
    { cors: true },
    async (req, res) => {
        try {
            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
            const { messages, model = "gpt-4o-mini", max_tokens = 400 } = req.body;

            if (!messages) {
                res.status(400).send("Messages are required");
                return;
            }

            const stream = await openai.chat.completions.create({
                model: model,
                messages: messages,
                stream: true,
                max_tokens: max_tokens,
            });

            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");

            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || "";
                if (content) {
                    res.write(`data: ${JSON.stringify({ content })}\n\n`);
                }
            }

            res.write("data: [DONE]\n\n");
            res.end();
        } catch (error) {
            console.error("Error in streamIntuitive:", error);
            res.status(500).send("Internal Server Error");
        }
    }
);

// Marks a student's work against a question + markscheme using a vision model.
// Returns structured JSON: { score, total, feedback[], overallComment }.
export const markWithAI = onRequest(
    { cors: true, timeoutSeconds: 120, memory: "1GiB" },
    async (req, res) => {
        try {
            if (req.method !== "POST") {
                res.status(405).send("Method not allowed");
                return;
            }

            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });

            const {
                questionImage,
                markschemeImage,
                questionImageUrl,
                markschemeImageUrl,
                workImage,
                workImages,
                model = "gpt-5.4-mini",
                reasoning_effort = "medium",
                qualification = "GCSE",
            } = req.body || {};

            // OpenAI's image_url field accepts either a public URL or a base64 data URL.
            // Prefer URLs (cheaper, avoids browser CORS) and fall back to inline data.
            const questionImg: string | undefined = questionImageUrl || questionImage;
            const markschemeImg: string | undefined = markschemeImageUrl || markschemeImage;

            const works: string[] = Array.isArray(workImages)
                ? workImages.filter((s) => typeof s === "string" && s.length > 0)
                : typeof workImage === "string" && workImage.length > 0
                    ? [workImage]
                    : [];

            if (!questionImg || !markschemeImg || works.length === 0) {
                res.status(400).json({
                    error: "question image, markscheme image, and at least one work image are required",
                });
                return;
            }

            const systemPrompt = `You are an experienced ${qualification} Maths examiner. You will be shown three images:
1. The exam QUESTION
2. The official MARKSCHEME / mark allocation
3. The STUDENT'S attempt (handwritten or typed work)

Mark the student's work strictly against the markscheme. For every mark point in the markscheme, decide whether the student has earned it. Be fair but rigorous — partial method marks count even with arithmetic errors if the method is correct (this is the standard "M" / "A" approach).

The STUDENT'S WORK image(s) may be: a photo of handwritten paper, a screenshot, OR a digital annotation layer (red ink on white) where the student wrote answers using an on-screen pen tool. In the digital case, the strokes show only the student's writing, not the original question — read the handwriting and match it to mark points by content, not position.

Return ONLY a JSON object with this exact shape:
{
  "score": <integer, marks awarded>,
  "total": <integer, total marks available per the markscheme>,
  "feedback": [
    {
      "mark": "<short label e.g. 'M1' or 'B1 - correct expansion'>",
      "awarded": <true|false>,
      "reasoning": "<one sentence: why it was or wasn't awarded, referencing what the student wrote>"
    }
  ],
  "overallComment": "<2-3 sentences of encouraging but specific feedback on what to improve>"
}

Do not include any prose outside the JSON. Use UK mathematical conventions.`;

            const userContent: any[] = [
                { type: "text", text: "QUESTION:" },
                { type: "image_url", image_url: { url: questionImg } },
                { type: "text", text: "MARKSCHEME:" },
                { type: "image_url", image_url: { url: markschemeImg } },
                {
                    type: "text",
                    text: works.length === 1
                        ? "STUDENT'S WORK:"
                        : `STUDENT'S WORK (${works.length} photos — treat them as consecutive pages of one answer):`,
                },
                ...works.map((url) => ({ type: "image_url", image_url: { url } })),
                { type: "text", text: "Mark the student's work and return the JSON object as specified." },
            ];

            const isReasoningModel = /^(o\d|gpt-5)/i.test(model);

            const params: any = {
                model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userContent },
                ],
                response_format: { type: "json_object" },
            };

            if (isReasoningModel) {
                params.reasoning_effort = reasoning_effort;
                // Reasoning tokens count against this budget, so a low cap can be
                // entirely consumed by reasoning, leaving empty content. Give it
                // ample room so the model can both reason and emit the JSON.
                params.max_completion_tokens = 6000;
            } else {
                params.max_tokens = 2000;
            }

            const completion = await openai.chat.completions.create(params);
            const choice = completion.choices[0];
            const raw = choice?.message?.content || "";

            // An empty body usually means the model ran out of tokens mid-reasoning
            // (finish_reason "length"). Surface it as an error rather than shipping
            // "{}" with a 200 — the client would otherwise crash rendering it.
            if (!raw.trim()) {
                res.status(502).json({
                    error: "The AI ran out of room before finishing. Please try again.",
                    finishReason: choice?.finish_reason || null,
                });
                return;
            }

            let parsed: any;
            try {
                parsed = JSON.parse(raw);
            } catch {
                res.status(502).json({ error: "Model returned non-JSON output", raw });
                return;
            }

            // Guarantee the contract the client renders against. Without this a
            // partial/malformed object (e.g. missing feedback[]) reaches the UI and
            // crashes it.
            if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.feedback)) {
                res.status(502).json({
                    error: "The AI returned an unexpected result. Please try again.",
                    raw,
                });
                return;
            }

            res.status(200).json(parsed);
        } catch (error: any) {
            console.error("Error in markWithAI:", error);
            res.status(500).json({
                error: "Internal Server Error",
                message: error?.message || String(error),
            });
        }
    }
);
