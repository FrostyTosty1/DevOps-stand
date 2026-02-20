// Tiny API client for the backend.

export type Task = {
  id: string;
  title: string;
  done: boolean;
  created_at: string;
  updated_at: string;
};

const DEFAULT_TIMEOUT_MS = 15_000;

// Helper: fetch with AbortController timeout (prevents infinite hangs)
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

// Fetch list of tasks from FastAPI
export async function fetchTasks(): Promise<Task[]> {
  const res = await fetchWithTimeout("/api/tasks");
  if (!res.ok) {
    const text = await safeReadText(res);
    throw new Error(`GET /api/tasks → HTTP ${res.status}: ${text}`);
  }
  return (await res.json()) as Task[];
}


// Create a new task (POST /api/tasks/)
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

// Helper: try read text even if server returned JSON
async function safeReadText(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text || "<empty>";
  } catch {
    return "<no-body>";
  }
}

// Toggle task 'done' flag (PATCH /api/tasks/:id)
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

// Delete a task by id (DELETE /api/tasks/:id)
export async function deleteTask(id: string): Promise<void> {
  const res = await fetchWithTimeout(`/api/tasks/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const text = await safeReadText(res);
    throw new Error(`DELETE /api/tasks/${id} → HTTP ${res.status}: ${text}`);
  }
  // 204 No Content → just return
}

// Update task title (PATCH /api/tasks/:id)
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