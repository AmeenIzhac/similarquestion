"""
Pre-generate ChatBot responses for all questions using OpenAI API.

Generates 3 types of responses per question:
  - hint: A hint to get started
  - concept: What mathematical concepts are needed
  - steps: Step-by-step walkthrough (delimited so each step can be shown one at a time)

Usage:
  pip install openai
  python scripts/pregenerate_responses.py

Output:
  public/pregenerated-responses.json
"""

import os
import json
import base64
import glob
import time
from openai import OpenAI

# ============================================================
# PUT YOUR OPENAI API KEY HERE
OPENAI_API_KEY = "put-key-here-mate"
# ============================================================

client = OpenAI(api_key=OPENAI_API_KEY)
MODEL = "gpt-5.4-nano"

QUESTIONS_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "edexcel-gcse-maths-questions")
ANSWERS_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "edexcel-gcse-maths-answers")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "public", "pregenerated-responses.json")

STEP_DELIMITER = "---STEP_BREAK---"

# ── Prompts (matching ChatBot.tsx) ──────────────────────────

HINT_SYSTEM_PROMPT = """You are a helpful GCSE Maths tutor. You can SEE the question image and the markscheme (answer key) image that have been provided.

Your role is to:
1. Look at the question image and understand what it's asking
2. Use the markscheme to guide them towards the correct answer, but NEVER give them the exact direct answer or reveal what the markscheme says.
3. Give hints rather than full solutions
4. Explain mathematical concepts clearly and simply
5. Use encouraging language
6. Keep responses SHORT and concise (3-5 sentences max)
7. If they want step-by-step help, tell them to click the "Step by step" button
8. Use LaTeX notation for all mathematical expressions. Use $...$ for inline math and $$...$$ for display math.
9. Use UK-style mathematics notation. Specifically, do NOT use the dot for multiplication (use $\\times$ or juxtaposition where appropriate).

Format your response clearly."""

CONCEPT_SYSTEM_PROMPT = """You are a helpful GCSE Maths tutor. You can SEE the question image and the markscheme (answer key) image that have been provided.

Your role is to:
1. Look at the question image and understand what it's asking
2. Use the markscheme to guide them towards the correct answer, but NEVER give them the exact direct answer or reveal what the markscheme says.
3. Give hints rather than full solutions
4. Explain mathematical concepts clearly and simply
5. Use encouraging language
6. Keep responses SHORT and concise (3-5 sentences max)
7. If they want step-by-step help, tell them to click the "Step by step" button
8. Use LaTeX notation for all mathematical expressions. Use $...$ for inline math and $$...$$ for display math.
9. Use UK-style mathematics notation. Specifically, do NOT use the dot for multiplication (use $\\times$ or juxtaposition where appropriate).

Format your response clearly."""

STEP_BY_STEP_SYSTEM_PROMPT = f"""You are a helpful GCSE Maths tutor. You can SEE the question image and the markscheme (answer key) image that have been provided.

IMPORTANT: The student has asked for step-by-step help. You must provide ALL steps for solving this question in a single response.

YOUR RULES:
1. Provide a COMPLETE step-by-step solution covering every step from start to finish.
2. Separate each step with the delimiter: {STEP_DELIMITER}
3. Each step should be SHORT (2-4 sentences maximum).
4. Each step (except the last) should end by encouraging the student to continue.
5. Be encouraging and supportive throughout.
6. Look at the question image carefully and provide specific guidance for THIS question.
7. Use the markscheme to guide the student towards the correct answer shown, but NEVER tell them the direct answer or show them the markscheme directly until the FINAL step.
8. The FINAL step should reveal the complete answer/solution.
9. Use LaTeX notation for all mathematical expressions. Use $...$ for inline math and $$...$$ for display math.
10. Use UK-style mathematics notation. Specifically, do NOT use the dot for multiplication (use $\\times$ or juxtaposition where appropriate).

Format example (use the delimiter to separate steps):
Let's start by reading the question carefully. We need to find the value of $x$. Ready for the next step?
{STEP_DELIMITER}
Now, let's set up our equation. From the diagram, we can see that...Ready for the next step?
{STEP_DELIMITER}
Great work! The final answer is $x = 5$. Well done!

Format your response clearly."""

HINT_USER_MSG = "Can you give me a hint to get started on this question?"
CONCEPT_USER_MSG = "What mathematical concepts do I need to know for this question?"
STEP_USER_MSG = "Please explain how to solve this question step by step, giving me ALL the steps separated by the delimiter."


def image_to_base64(path: str) -> str | None:
    try:
        with open(path, "rb") as f:
            data = base64.b64encode(f.read()).decode("utf-8")
        return f"data:image/png;base64,{data}"
    except FileNotFoundError:
        return None


def build_user_content(question_b64: str | None, markscheme_b64: str | None, user_msg: str) -> list:
    content = []
    if question_b64:
        content.append({"type": "text", "text": "Target Question Image:"})
        content.append({"type": "image_url", "image_url": {"url": question_b64}})
    if markscheme_b64:
        content.append({"type": "text", "text": "Markscheme/Answer Key Image for reference (DO NOT GIVE THE DIRECT ANSWER AWAY):"})
        content.append({"type": "image_url", "image_url": {"url": markscheme_b64}})
    content.append({"type": "text", "text": user_msg})
    return content


def call_openai(system_prompt: str, user_content: list, max_tokens: int = 800) -> str:
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        max_completion_tokens=max_tokens,
    )
    return response.choices[0].message.content.strip()


def process_question(label_id: str) -> dict:
    question_path = os.path.join(QUESTIONS_DIR, label_id)
    answer_path = os.path.join(ANSWERS_DIR, label_id)

    question_b64 = image_to_base64(question_path)
    markscheme_b64 = image_to_base64(answer_path)

    if not question_b64:
        print(f"  [SKIP] No question image for {label_id}")
        return None

    user_content_hint = build_user_content(question_b64, markscheme_b64, HINT_USER_MSG)
    user_content_concept = build_user_content(question_b64, markscheme_b64, CONCEPT_USER_MSG)
    user_content_steps = build_user_content(question_b64, markscheme_b64, STEP_USER_MSG)

    print(f"  Generating hint...")
    hint = call_openai(HINT_SYSTEM_PROMPT, user_content_hint, max_tokens=400)

    print(f"  Generating concepts...")
    concept = call_openai(CONCEPT_SYSTEM_PROMPT, user_content_concept, max_tokens=400)

    print(f"  Generating step-by-step...")
    steps_raw = call_openai(STEP_BY_STEP_SYSTEM_PROMPT, user_content_steps, max_tokens=1200)

    # Split steps by delimiter and clean up
    steps = [s.strip() for s in steps_raw.split(STEP_DELIMITER) if s.strip()]

    return {
        "hint": hint,
        "concept": concept,
        "steps": steps,
    }


def main():
    # Load existing progress if any (allows resuming)
    results = {}
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r") as f:
            results = json.load(f)
        print(f"Loaded {len(results)} existing entries from {OUTPUT_FILE}")

    # Get all question files
    question_files = sorted(os.listdir(QUESTIONS_DIR))
    question_files = [f for f in question_files if f.endswith(".png")]
    total = len(question_files)
    print(f"Found {total} questions total")

    for i, label_id in enumerate(question_files):
        if label_id in results:
            print(f"[{i+1}/{total}] {label_id} — already done, skipping")
            continue

        print(f"[{i+1}/{total}] Processing {label_id}...")
        try:
            result = process_question(label_id)
            if result:
                results[label_id] = result

                # Save after each question so we can resume
                with open(OUTPUT_FILE, "w") as f:
                    json.dump(results, f, indent=2)

        except Exception as e:
            print(f"  [ERROR] {e}")
            # Rate limit handling
            if "rate_limit" in str(e).lower() or "429" in str(e):
                print("  Rate limited, waiting 60s...")
                time.sleep(60)
            else:
                time.sleep(1)

    print(f"\nDone! Generated responses for {len(results)} questions.")
    print(f"Output: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
