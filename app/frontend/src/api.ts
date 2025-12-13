// Tiny API client for the backend.

export type Task = {
  id: string;
  title: string;
  done: boolean;
  created_at: string;
  updated_at: string;
};

// Fetch list of tasks from FastAPI
export async function fetchTasks(): Promise<Task[]> {
  const res = await fetch("/api/tasks");
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GET /api/tasks → HTTP ${res.status}: ${text || "<empty>"}`);
  }
  return res.json() as Promise<Task[]>;
}


// Create a new task (POST /api/tasks/:id)
export async function createTask(title: string): Promise<Task> {
  const res = await fetch(`/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    const text = await safeReadText(res);
    throw new Error(`POST /api/tasks → HTTP ${res.status}: ${text}`);
  }
  return res.json();
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
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ done }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PATCH /api/tasks/${id} → HTTP ${res.status}: ${text || "<empty>"}`);
  }
  return res.json() as Promise<Task>;
}

// Delete a task by id (DELETE /api/tasks/:id)
export async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`DELETE /api/tasks/${id} → HTTP ${res.status}: ${text || "<empty>"}`);
  }
  // 204 No Content → just return
}

// Update task title (PATCH /api/tasks/:id)
export async function updateTaskTitle(id: string, title: string): Promise<Task> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PATCH /api/tasks/${id} → HTTP ${res.status}: ${text || "<empty>"}`);
  }
  return res.json() as Promise<Task>;
}