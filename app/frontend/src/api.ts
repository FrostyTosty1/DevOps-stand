// Small client for the TinyTasks backend API.

export type Task = {
  id: string;
  title: string;
  done: boolean;
  created_at: string;
  updated_at: string;
};

// Default timeout for all API requests made from this file.
const DEFAULT_TIMEOUT_MS = 15_000;

// Fetch wrapper with AbortController-based timeout support.
// If the request takes too long, it is aborted and converted
// into a normal Error with a readable message.
async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const t = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw e;
  } finally {
    window.clearTimeout(t);
  }
}

// Read the response body in the safest possible way for error messages.
// Even if the server returned no body or reading fails, return a fallback string
// so the caller can still build a useful Error message.
async function safeReadText(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text || "<empty>";
  } catch {
    return "<no-body>";
  }
}

// Load all tasks from the backend.
export async function fetchTasks(): Promise<Task[]> {
  const res = await fetchWithTimeout("/api/tasks");
  if (!res.ok) {
    const text = await safeReadText(res);
    throw new Error(`GET /api/tasks → HTTP ${res.status}: ${text}`);
  }
  return (await res.json()) as Task[];
}

// Create a new task and return the created object from the backend.
export async function createTask(title: string): Promise<Task> {
  const res = await fetchWithTimeout(`/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    const text = await safeReadText(res);
    throw new Error(`POST /api/tasks → HTTP ${res.status}: ${text}`);
  }
  return (await res.json()) as Task;
}

// Update only the "done" field of one task and return the updated object.
export async function toggleTaskDone(id: string, done: boolean): Promise<Task> {
  const res = await fetchWithTimeout(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ done }),
  });
  if (!res.ok) {
    const text = await safeReadText(res);
    throw new Error(`PATCH /api/tasks/${id} → HTTP ${res.status}: ${text}`);
  }
  return (await res.json()) as Task;
}

// Delete one task.
// The backend returns 204 No Content on success, so there is no JSON body to parse.
export async function deleteTask(id: string): Promise<void> {
  const res = await fetchWithTimeout(`/api/tasks/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const text = await safeReadText(res);
    throw new Error(`DELETE /api/tasks/${id} → HTTP ${res.status}: ${text}`);
  }
}

// Update only the title of one task and return the updated object.
export async function updateTaskTitle(id: string, title: string): Promise<Task> {
  const res = await fetchWithTimeout(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    const text = await safeReadText(res);
    throw new Error(`PATCH /api/tasks/${id} → HTTP ${res.status}: ${text}`);
  }
  return (await res.json()) as Task;
}