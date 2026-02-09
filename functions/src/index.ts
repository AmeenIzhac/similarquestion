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
