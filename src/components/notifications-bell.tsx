import { useEffect, useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  link_path: string;
  read_at: string | null;
  created_at: string;
};

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function NotificationsBell({ userId }: { userId: string | null | undefined }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const { data: notifications = [] } = useQuery<NotificationRow[]>({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, body, link_path, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
  });

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("recipient_id", userId)
        .is("read_at", null);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] }),
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notif:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow;
          queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
          toast(row.title, {
            description: row.body ?? undefined,
            action: {
              label: "View",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick: () => navigate({ to: row.link_path as any }),
            },
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient, navigate]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const handleClick = async (n: NotificationRow) => {
    setOpen(false);
    if (!n.read_at) markRead.mutate(n.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ to: n.link_path as any });
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-foreground/80 transition hover:bg-secondary"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-verified px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notifications
            </p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                className="text-[11px] font-medium text-verified hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                All quiet for now.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleClick(n)}
                      className={`flex w-full items-start gap-2 px-3 py-2.5 text-left transition hover:bg-secondary/60 ${
                        !n.read_at ? "bg-secondary/30" : ""
                      }`}
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          !n.read_at ? "bg-verified" : "bg-transparent"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-foreground">
                          {n.title}
                        </span>
                        {n.body ? (
                          <span className="mt-0.5 block line-clamp-2 text-[11px] text-muted-foreground">
                            {n.body}
                          </span>
                        ) : null}
                        <span className="mt-1 block text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          {timeAgo(n.created_at)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}