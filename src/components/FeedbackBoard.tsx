"use client";

import { useState, useTransition } from "react";
import { MessageSquare, Star, Trash2 } from "lucide-react";
import {
  addFeedback,
  addFeedbackComment,
  deleteFeedback,
  deleteFeedbackComment,
  updateFeedbackStatus,
} from "@/app/(app)/feedback/actions";
import type { FeedbackStatus } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

const STATUS_CLASS: Record<FeedbackStatus, string> = {
  OPEN: "text-foreground/60",
  IN_PROGRESS: "text-primary",
  DONE: "text-foreground/40 line-through",
};

export type FeedbackComment = {
  id: string;
  body: string;
  createdAt: string;
};

export type FeedbackItem = {
  id: string;
  message: string;
  rating: number | null;
  status: FeedbackStatus;
  createdAt: string;
  comments: FeedbackComment[];
};

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? 0 : n)}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          className="text-primary"
        >
          <Star className={`h-5 w-5 ${n <= value ? "fill-primary" : "fill-none"}`} />
        </button>
      ))}
    </div>
  );
}

function StaticStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 text-primary ${n <= rating ? "fill-primary" : "fill-none"}`}
        />
      ))}
    </div>
  );
}

/** The submit form alone — used both on the admin board and as the entire
 * page for regular users, who can send feedback but not read or respond to
 * the board (see feedback/page.tsx and feedback/actions.ts). */
export function FeedbackSubmitForm() {
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          await addFeedback({ message, rating: rating || undefined });
          setMessage("");
          setRating(0);
          setSubmitted(true);
        });
      }}
      className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/60 p-5"
    >
      <p className="font-display text-lg font-semibold text-foreground">Leave feedback</p>
      <Textarea
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          setSubmitted(false);
        }}
        placeholder="What's working, what's not, what would you like to see?"
        rows={3}
      />
      <div className="flex items-center justify-between">
        <StarRating value={rating} onChange={setRating} />
        <Button type="submit" disabled={isPending || !message.trim()} className="rounded-full">
          {isPending ? "Saving…" : "Submit"}
        </Button>
      </div>
      {submitted && (
        <p className="text-xs text-foreground/50">Thanks — your feedback was submitted.</p>
      )}
    </form>
  );
}

export function FeedbackBoard({ items }: { items: FeedbackItem[] }) {
  return (
    <div className="flex flex-col gap-6">
      <FeedbackSubmitForm />

      <div className="flex flex-col gap-3">
        {items.length === 0 && (
          <p className="text-sm text-foreground/50">No feedback yet.</p>
        )}
        {items.map((item) => (
          <FeedbackCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function FeedbackCard({ item }: { item: FeedbackItem }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-xl border border-border/60 bg-surface/70 p-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          {item.rating !== null && <StaticStars rating={item.rating} />}
          <p className="text-foreground">{item.message}</p>
          <p className="text-xs text-foreground/50">
            {new Date(item.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Select
            value={item.status}
            onValueChange={(value) =>
              startTransition(() => updateFeedbackStatus(item.id, value as FeedbackStatus))
            }
          >
            <SelectTrigger size="sm" className={STATUS_CLASS[item.status]}>
              <SelectValue>{(value) => STATUS_LABELS[value as FeedbackStatus]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_LABELS) as FeedbackStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => deleteFeedback(item.id))}
            className="text-foreground/40 hover:text-primary"
            aria-label="Delete feedback"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setCommentsOpen((v) => !v)}
        className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <MessageSquare className="h-3 w-3" />
        {item.comments.length > 0
          ? `${item.comments.length} comment${item.comments.length === 1 ? "" : "s"}`
          : "Add comment"}
      </button>

      {commentsOpen && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border/40 pt-3">
          {item.comments.map((c) => (
            <div
              key={c.id}
              className="flex items-start justify-between gap-2 rounded bg-card/50 p-2"
            >
              <div>
                <p className="text-xs text-foreground/80">{c.body}</p>
                <p className="mt-0.5 text-[11px] text-foreground/40">
                  {new Date(c.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => startTransition(() => deleteFeedbackComment(c.id))}
                className="text-foreground/40 hover:text-primary"
                aria-label="Delete comment"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                await addFeedbackComment(item.id, commentBody);
                setCommentBody("");
              });
            }}
            className="flex gap-2"
          >
            <Textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Add a comment…"
              rows={1}
              className="min-h-8 flex-1"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isPending || !commentBody.trim()}
              className="self-start rounded-full"
            >
              Add
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
