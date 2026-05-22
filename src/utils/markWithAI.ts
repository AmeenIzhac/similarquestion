export interface MarkFeedbackItem {
  mark: string;
  awarded: boolean;
  reasoning: string;
}

export interface MarkResult {
  score: number;
  total: number;
  feedback: MarkFeedbackItem[];
  overallComment: string;
}

function resolveFunctionUrl(): string {
  const override = import.meta.env.VITE_MARK_WITH_AI_URL as string | undefined;
  if (override) return override;
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const isLocal = host === "localhost" || host === "127.0.0.1";
  if (isLocal) {
    return "http://127.0.0.1:5001/similarquestion-284db/us-central1/markWithAI";
  }
  // Default v1-compatible URL for the deployed function. Override via
  // VITE_MARK_WITH_AI_URL if your deploy gives a different (Cloud Run) URL,
  // e.g. https://markwithai-<hash>-uc.a.run.app
  return "https://us-central1-similarquestion-284db.cloudfunctions.net/markWithAI";
}

const FUNCTION_URL = resolveFunctionUrl();

// Exports the pen-drawing canvas as a PNG on a white background.
// We deliberately do not composite the question image here — fetching it
// cross-origin into a canvas would taint the canvas (CORS) and break toDataURL.
// The Firebase function passes the question URL to OpenAI separately, so the
// model sees both images and treats this one as the student's written work.
export function exportPenWork(drawingCanvas: HTMLCanvasElement): string {
  const out = document.createElement("canvas");
  out.width = drawingCanvas.width;
  out.height = drawingCanvas.height;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(drawingCanvas, 0, 0);
  return out.toDataURL("image/png");
}

export async function callMarkWithAI(params: {
  questionImageUrl: string;
  markschemeImageUrl: string;
  workImages: string[]; // one or more data URLs
  qualification?: string;
  model?: string;
  reasoningEffort?: "low" | "medium" | "high";
}): Promise<MarkResult> {
  if (!params.workImages?.length) {
    throw new Error("At least one work image is required");
  }

  // Pass R2 URLs through to the server. OpenAI fetches them directly, so the
  // browser never has to deal with R2's CORS policy.
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      questionImageUrl: params.questionImageUrl,
      markschemeImageUrl: params.markschemeImageUrl,
      workImages: params.workImages,
      qualification: params.qualification || "GCSE",
      model: params.model || "gpt-5.4-mini",
      reasoning_effort: params.reasoningEffort || "medium",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mark API ${res.status}: ${text}`);
  }
  return (await res.json()) as MarkResult;
}
