"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { ChevronDown, LogOut, Plus, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Task = { id: string; title: string; is_completed: boolean };
type Category = { id: string; name: string; tasks: Task[] };
const date = new Date().toISOString().slice(0, 10);
const key = ["tasks", date];

async function request(path: string, options?: RequestInit) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok)
    throw new Error(
      (await response.json().catch(() => null))?.error ?? "Request failed",
    );
  return response.status === 204 ? null : response.json();
}

export default function Home() {
  const { data: session, isPending: loadingSession } = authClient.useSession();
  const client = useQueryClient();
  const [tab, setTab] = useState<string>("");
  const [taskDialog, setTaskDialog] = useState(false);
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const tasks = useQuery<Category[]>({
    queryKey: key,
    queryFn: () => request(`/api/tasks?date=${date}`),
    enabled: Boolean(session?.user),
  });
  const categories = tasks.data ?? [];
  const activeId = tab || categories[0]?.id || "";
  const activeCategory = categories.find((item) => item.id === activeId);
  const refresh = () => client.invalidateQueries({ queryKey: key });
  const toggle = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      request(`/api/tasks/${id}/toggle`, {
        method: "PATCH",
        body: JSON.stringify({ date, is_completed: completed }),
      }),
    onMutate: async ({ id, completed }) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<Category[]>(key);
      client.setQueryData<Category[]>(key, (old) =>
        old?.map((c) => ({
          ...c,
          tasks: c.tasks.map((t) =>
            t.id === id ? { ...t, is_completed: completed } : t,
          ),
        })),
      );
      return { previous };
    },
    onError: (_error, _variables, context) =>
      client.setQueryData(key, context?.previous),
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      request(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
  });
  const removeCategory = useMutation({
    mutationFn: (id: string) =>
      request(`/api/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setTab("");
      refresh();
    },
  });
  const addTask = useMutation({
    mutationFn: () =>
      request("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title, category_id: categoryId || activeId }),
      }),
    onSuccess: () => {
      setTitle("");
      setTaskDialog(false);
      refresh();
    },
  });
  const addCategory = useMutation({
    mutationFn: () =>
      request("/api/categories", {
        method: "POST",
        body: JSON.stringify({ name: categoryName }),
      }),
    onSuccess: (category) => {
      setCategoryName("");
      setCategoryDialog(false);
      setTab(category.id);
      refresh();
    },
  });
  const completeTask = (task: Task, completed: boolean) => {
    toggle.mutate({ id: task.id, completed });
    if (completed) {
      toast.success(`"${task.title}" is completed`, {
        action: {
          label: "Undo",
          onClick: () => toggle.mutate({ id: task.id, completed: false }),
        },
        actionButtonStyle: {
          backgroundColor: "#ececea",
          color: "#000000",
          borderRadius: "6px",
          fontWeight: "500",
        },
      });
    }
  };

  if (loadingSession)
    return (
      <main className="grid min-h-screen place-items-center text-slate-500">
        Loading…
      </main>
    );
  if (!session?.user)
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <section className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold">Daily Checklist</h1>
          <p className="mt-2 text-sm text-slate-500">
            A focused list for the work that repeats every day.
          </p>
          <button
            onClick={() => authClient.signIn.social({ provider: "google" })}
            className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white"
          >
            Continue with Google
          </button>
        </section>
      </main>
    );
  const submitTask = (event: FormEvent) => {
    event.preventDefault();
    if (title.trim() && (categoryId || activeId)) addTask.mutate();
  };
  const submitCategory = (event: FormEvent) => {
    event.preventDefault();
    if (categoryName.trim()) addCategory.mutate();
  };
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 sm:px-6">
      <header className=" mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex w-full items-center justify-end gap-2">
          <button
            onClick={() => setCategoryDialog(true)}
            className="rounded-lg border bg-white px-3 py-2 text-sm font-medium"
          >
            Add Category
          </button>
          <button
            onClick={() => {
              setCategoryId(activeId);
              setTaskDialog(true);
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
          >
            <Plus size={16} />
            Add Task
          </button>
          <button
            aria-label="Sign out"
            onClick={() => authClient.signOut()}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-200"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>
      {tasks.isError && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {(tasks.error as Error).message}
        </p>
      )}
      {tasks.isLoading ? (
        <p className="text-slate-500">Loading checklist…</p>
      ) : categories.length === 0 ? (
        <section className="rounded-xl border border-dashed bg-white p-10 text-center text-slate-500">
          Create a category to begin.
        </section>
      ) : (
        <>
          <div className="mb-5 flex w-full gap-2 overflow-x-auto border-b">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setTab(category.id)}
                className={`flex-1 min-w-max text-center whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeId === category.id
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
          <section className="rounded-xl border bg-white">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="font-semibold">{activeCategory?.name}</h2>
              {activeCategory && (
                <DeleteCategoryDialog
                  category={activeCategory}
                  deleting={removeCategory.isPending}
                  onDelete={() => removeCategory.mutate(activeCategory.id)}
                />
              )}
            </div>
            <div className="divide-y">
              {activeCategory?.tasks.some((task) => !task.is_completed) ? (
                activeCategory.tasks
                  .filter((task) => !task.is_completed)
                  .map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={(completed) => completeTask(task, completed)}
                      onDelete={() => remove.mutate(task.id)}
                      deleting={remove.isPending}
                    />
                  ))
              ) : (
                <p className="p-5 text-sm text-slate-500">
                  No tasks in this category yet.
                </p>
              )}
            </div>
          </section>
        </>
      )}
      {(taskDialog || categoryDialog) && (
        <div className="fixed inset-0 z-10 grid place-items-center bg-slate-950/40 p-4">
          <form
            onSubmit={taskDialog ? submitTask : submitCategory}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {taskDialog ? "Add Task" : "Add Category"}
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => {
                  setTaskDialog(false);
                  setCategoryDialog(false);
                }}
              >
                ×
              </button>
            </div>
            <input
              autoFocus
              value={taskDialog ? title : categoryName}
              onChange={(event) =>
                taskDialog
                  ? setTitle(event.target.value)
                  : setCategoryName(event.target.value)
              }
              placeholder={taskDialog ? "Task title" : "Category name"}
              className="mt-5 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
            />
            {taskDialog && (
              <div className="relative mt-3">
                <select
                  value={categoryId || activeId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className="w-full appearance-none rounded-lg border bg-white px-3 py-2"
                >
                  <option value="" disabled>
                    Select category
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-2.5"
                  size={16}
                />
              </div>
            )}
            <button
              disabled={addTask.isPending || addCategory.isPending}
              className="mt-5 w-full rounded-lg bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60"
            >
              {addTask.isPending || addCategory.isPending ? "Saving…" : "Save"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}

function TaskRow({
  task,
  onToggle,
  onDelete,
  deleting,
}: {
  task: Task;
  onToggle: (completed: boolean) => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="group flex items-center gap-3 px-5 py-4">
      <input
        type="checkbox"
        checked={task.is_completed}
        onChange={(event) => onToggle(event.target.checked)}
        className="h-4 w-4 accent-slate-900"
      />
      <span
        className={`flex-1 text-sm ${task.is_completed ? "text-slate-400 line-through" : ""}`}
      >
        {task.title}
      </span>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            aria-label={`Delete ${task.title}`}
            className="rounded p-1 text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
          >
            <Trash2 size={16} />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>
            Delete task{" "}
            <span className="font-bold text-black ">"{task.title}" </span> ?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Task <span className="font-bold text-black ">"{task.title}" </span>
            will be deleted.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg border px-3 py-2 text-sm font-medium">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={onDelete}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DeleteCategoryDialog({
  category,
  onDelete,
  deleting,
}: {
  category: Category;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-red-50 hover:text-red-600">
          <Trash2 size={15} />
          Delete Category
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>Delete category “{category.name}”?</AlertDialogTitle>
        <AlertDialogDescription>
          {category.tasks.length > 0 ? (
            <>
              Category{" "}
              <span className="font-bold text-black ">{category.name}</span> has{" "}
              <span className="font-bold text-black ">
                {category.tasks.length}
              </span>{" "}
              task(s). All tasks and their completion history will be
              permanently deleted.
            </>
          ) : (
            <>
              Category{" "}
              <span className="font-bold text-black ">{category.name}</span> is
              empty and will be permanently deleted.
            </>
          )}
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-lg border px-3 py-2 text-sm font-medium">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            onClick={onDelete}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete Category"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
