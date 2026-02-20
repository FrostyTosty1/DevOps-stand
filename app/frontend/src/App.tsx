import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction, FormEvent } from "react";
import {
  fetchTasks,
  createTask,
  toggleTaskDone,
  deleteTask,
  updateTaskTitle,
  type Task,
} from "./api";

// Top-level component: fetch and render tasks from the backend.
export default function App() {
  // UI state: loading, error, and fetched tasks
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState(""); // input state for new task

  // Inline edit state for a single task
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Pending flags to avoid double-clicks and show progress
  const [adding, setAdding] = useState(false); // for Add form
  const [pendingToggle, setPendingToggle] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<Set<string>>(new Set());
  const [pendingSave, setPendingSave] = useState<Set<string>>(new Set());

  // Client-side filter state: all / open / done
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");

  // Dark mode state (persist to localStorage and toggle <html>.classList)
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("tt.dark");
    if (saved === "true") return true;
    if (saved === "false") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  // Visual animation states (safe, no hooks inside .map)
  const [appeared, setAppeared] = useState<Set<string>>(new Set());       // items that finished appear animation
  const [deletingVisual, setDeletingVisual] = useState<Set<string>>(new Set()); // items currently fading out

  useEffect(() => {
    // Load tasks on first render
    fetchTasks()
      .then(setTasks)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Apply/remove `dark` class on <html>, persist choice
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("tt.dark", String(dark));
  }, [dark]);

  useEffect(() => {
    // Mark newly seen tasks as "appearing" → next tick they become "appeared"
    // This gives fade/slide-in without per-item hooks.
    const idsToSchedule: string[] = [];
    for (const t of tasks) {
      if (!appeared.has(t.id)) idsToSchedule.push(t.id);
    }
    if (idsToSchedule.length > 0) {
      // Next tick to allow initial render with opacity-0/translate-y
      const t = setTimeout(() => {
        setAppeared((prev) => {
          const next = new Set(prev);
          idsToSchedule.forEach((id) => next.add(id));
          return next;
        });
      }, 0);
      return () => clearTimeout(t);
    }
  }, [tasks, appeared]);

  // Small helper: run async action while adding/removing id to a Set state
  function withId<T extends string>(
    setState: Dispatch<SetStateAction<Set<T>>>,
    id: T,
    fn: () => Promise<void>
  ) {
    setState((prev) => new Set(prev).add(id));
    return fn().finally(() => {
      setState((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
  }

  // Handle form submit: create a task via POST /api/tasks
  async function handleAddTask(e: FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title || adding) return; // ignore empty input or while pending
    setAdding(true);
    try {
      const created = await createTask(title);
      // Prepend newly created task to the list (no full refetch needed)
      setTasks((prev) => [created, ...prev]);
      setNewTitle(""); // clear input
      // Ensure newly added item runs appear animation
      setAppeared((prev) => {
        const next = new Set(prev);
        next.delete(created.id); // force it to start from hidden state for the next effect
        return next;
      });
    } catch (err) {
      console.error(err);
      alert("Failed to create task");
    } finally {
      setAdding(false);
    }
  }

  // Toggle 'done' flag via PATCH /api/tasks/:id
  async function handleToggle(task: Task) {
    if (pendingToggle.has(task.id)) return; // already in-flight
    await withId(setPendingToggle, task.id, async () => {
      try {
        const updated = await toggleTaskDone(task.id, !task.done);
        // Update item in place
        setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      } catch (err) {
        console.error(err);
        alert("Failed to update task status");
      }
    });
  }

  // Delete a task via DELETE /api/tasks/:id (with gentle fade-out)
  async function handleDelete(task: Task) {
    if (pendingDelete.has(task.id)) return;
    if (!confirm(`Delete task "${task.title}"?`)) return;

    await withId(setPendingDelete, task.id, async () => {
      try {
        await deleteTask(task.id);

        // Trigger gentle fade-out first
        setDeletingVisual((prev) => new Set(prev).add(task.id));

        // After the CSS transition ends (~180ms), remove from list
        setTimeout(() => {
          setTasks((prev) => prev.filter((t) => t.id !== task.id));
          setDeletingVisual((prev) => {
            const next = new Set(prev);
            next.delete(task.id);
            return next;
          });
          // Reset edit state if needed
          if (editingId === task.id) {
            setEditingId(null);
            setEditingTitle("");
          }
          // Also cleanup "appeared" set
          setAppeared((prev) => {
            const next = new Set(prev);
            next.delete(task.id);
            return next;
          });
        }, 180); // matches transition duration
      } catch (err) {
        console.error(err);
        alert("Failed to delete task");
      }
    });
  }

  // Start inline editing for a task
  function startEdit(task: Task) {
    setEditingId(task.id);
    setEditingTitle(task.title);
  }

  // Cancel inline editing
  function cancelEdit() {
    setEditingId(null);
    setEditingTitle("");
  }

  // Save new title via PATCH /api/tasks/:id
  async function saveEdit(task: Task) {
    const title = editingTitle.trim();
    if (!title || pendingSave.has(task.id)) return; // ignore empty/whitespace-only or while pending
    await withId(setPendingSave, task.id, async () => {
      try {
        const updated = await updateTaskTitle(task.id, title);
        setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
        setEditingId(null);
        setEditingTitle("");
      } catch (err) {
        console.error(err);
        alert("Failed to update title");
      }
    });
  }

  if (loading) return <div className="p-4">Loading…</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  // Apply client-side filtering before render
  const visibleTasks = tasks.filter((t) =>
    filter === "all" ? true : filter === "done" ? t.done : !t.done
  );

  return (
    
  <div className="min-h-screen flex justify-center bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
    <div className="mx-auto w-full max-w-2xl px-6 py-10 font-sans rounded-xl shadow-lg bg-white dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">TinyTasks</h1>

          {/* Dark mode toggle */}
          <button
            onClick={() => setDark((d) => !d)}
            className={`rounded-md px-3 py-1.5 text-sm transition focus:outline-none focus:ring-2 ${
              dark
                ? "bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-300"
                : "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-300"
            }`}
            title="Toggle dark mode"
          >
            {dark ? "Dark: ON" : "Dark: OFF"}
          </button>
        </div>

        {/* Filter controls: All / Open / Done */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("open")}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              filter === "open"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            Open
          </button>
          <button
            onClick={() => setFilter("done")}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              filter === "done"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            Done
          </button>
        </div>

        {/* Minimal input + button form to create a task */}
        <form onSubmit={handleAddTask} className="mb-4 flex gap-2">
          <input
            type="text"
            placeholder="New task title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:placeholder-gray-400"
          />
          <button
            type="submit"
            disabled={adding || !newTitle.trim()}
            className={`rounded-md px-4 py-2 text-white transition focus:outline-none focus:ring-2 ${
              adding
                ? "bg-blue-300 cursor-wait"
                : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-300"
            }`}
          >
            {adding ? "Adding…" : "Add"}
          </button>
        </form>

        {visibleTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-gray-600 dark:text-gray-400">
            {/* Emoji as temporary "icon" — later can replace with an SVG */}
            <div className="text-6xl mb-3">{tasks.length === 0 ? "📝" : "🎉"}</div>

            {tasks.length === 0 ? (
              <>
                <p className="text-lg font-medium mb-1">No tasks yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Add your first one above to get started.
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium mb-1">All tasks completed!</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Take a break, you deserve it ☕
                </p>
              </>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {visibleTasks.map((t) => {
              const isEditing = editingId === t.id;
              const isToggling = pendingToggle.has(t.id);
              const isDeleting = pendingDelete.has(t.id);
              const isSaving = pendingSave.has(t.id);

              // Animation flags
              const isAppeared = appeared.has(t.id);
              const isFadingOut = deletingVisual.has(t.id);

              return (
                <li
                  key={t.id}
                  className={`flex items-center justify-between gap-2 rounded-lg border p-3
                    border-gray-200 dark:border-gray-700
                    transition-all duration-200
                    ${t.done ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-white dark:bg-gray-800"}
                    ${isAppeared ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}
                    ${isFadingOut ? "opacity-0 scale-[0.98] translate-y-1" : ""}
                  `}
                >
                  <span className="min-w-0">
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(t);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="min-w-[220px] rounded-md border px-2 py-1 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 border-gray-300 dark:border-gray-700 dark:bg-gray-900"
                        placeholder="Edit title"
                      />
                    ) : (
                      <strong className="truncate">{t.title}</strong>
                    )}
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      {t.done ? "done" : "open"}
                    </span>
                  </span>

                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => saveEdit(t)}
                          disabled={isSaving}
                          className={`rounded-md px-3 py-1.5 transition focus:outline-none focus:ring-2 ${
                            isSaving
                              ? "bg-blue-300 text-white cursor-wait"
                              : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-300"
                          }`}
                          title="Save title"
                        >
                          {isSaving ? "Saving…" : "Save"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={isSaving}
                          className={`rounded-md px-3 py-1.5 transition focus:outline-none focus:ring-2 ${
                            isSaving
                              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                              : "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
                          }`}
                          title="Cancel editing"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEdit(t)}
                        className="rounded-md bg-amber-500 px-3 py-1.5 text-white transition hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-300"
                        title="Edit title"
                      >
                        Edit
                      </button>
                    )}

                    <button
                      onClick={() => handleToggle(t)}
                      disabled={isToggling || isFadingOut}
                      className={`rounded-md px-3 py-1.5 transition focus:outline-none focus:ring-2 ${
                        isToggling
                          ? "bg-gray-200 text-gray-400 cursor-wait"
                          : t.done
                          ? "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
                          : "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-300"
                      }`}
                      title={t.done ? "Undo" : "Mark as done"}
                    >
                      {isToggling ? "Saving…" : t.done ? "Undo" : "Done"}
                    </button>

                    <button
                      onClick={() => handleDelete(t)}
                      disabled={isDeleting || isFadingOut}
                      className={`rounded-md px-3 py-1.5 transition focus:outline-none focus:ring-2 ${
                        isDeleting || isFadingOut
                          ? "bg-red-300 text-white cursor-wait"
                          : "bg-red-600 text-white hover:bg-red-700 focus:ring-red-300"
                      }`}
                      title="Delete task"
                    >
                      {isDeleting ? "Deleting…" : "Delete"}
                    </button>

                    <span className="hidden text-xs text-gray-400 sm:inline">
                      {new Date(t.created_at).toLocaleString()}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
