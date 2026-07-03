// 本地 AI（Ollama）：全程在用户本机，研究内容不出本机。
// Ollama 默认监听 127.0.0.1:11434；未安装/未运行时优雅降级。
const HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";

export async function ollamaStatus(): Promise<{ available: boolean; models: string[] }> {
  try {
    const res = await fetch(`${HOST}/api/tags`, { signal: AbortSignal.timeout(1500) });
    if (!res.ok) return { available: false, models: [] };
    const d = (await res.json()) as { models?: { name: string }[] };
    return { available: true, models: (d.models ?? []).map((m) => m.name) };
  } catch {
    return { available: false, models: [] };
  }
}

export async function ollamaSummarize(text: string, model: string): Promise<string> {
  const prompt =
    "You are a research assistant for a sociology PhD's private library. " +
    "Summarise the source below in 5–8 sentences: its main topic, key points / arguments or findings, " +
    "and why it might matter for research. Keep proper nouns and dates. Reply in English.\n\n" +
    "SOURCE:\n" +
    text.slice(0, 12000);
  const res = await fetch(`${HOST}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false }),
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) throw new Error(`Ollama returned ${res.status}`);
  const d = (await res.json()) as { response?: string };
  return String(d.response ?? "").trim();
}
