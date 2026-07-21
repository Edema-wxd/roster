"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Droplet, Heart } from "lucide-react";

// The three things you log in Roster — intimacy, a visit, a cycle — cycled
// through while a page loads. Same icons as the calendar's "+ Intimacy /
// + Visit / + Cycle" actions, so the loader feels like part of the app.
const ICONS = [Heart, CalendarDays, Droplet];

export default function Loading() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    // Respect reduced-motion: hold on the first icon instead of cycling.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setActive((n) => (n + 1) % ICONS.length), 550);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-1 items-center justify-center p-6" role="status" aria-live="polite">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <div className="relative h-7 w-7">
          {ICONS.map((Icon, i) => (
            <Icon
              key={i}
              className={`absolute inset-0 h-7 w-7 text-primary transition-all duration-300 motion-reduce:transition-none ${
                i === active ? "scale-100 opacity-100" : "scale-75 opacity-0"
              }`}
              aria-hidden
            />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
