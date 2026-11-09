"use client";

import { useEffect, useState } from "react";

// The saved choice ('light' | 'dark' | 'system') lives in localStorage under this
// key. No entry means 'system'.
const KEY = "theme";
type Choice = "light" | "dark" | "system";

// Runs inline in <head>, before first paint, so the page never flashes the wrong
// theme. It also follows the system setting live while the choice is 'system'.
// Render it in the root layout's <head>, and put suppressHydrationWarning on
// <html>: the server can't know the attribute this sets.
const script = `(function(){try{
var k=${JSON.stringify(KEY)},m=matchMedia('(prefers-color-scheme: dark)'),r=document.documentElement;
function a(){var t=localStorage.getItem(k);var d=t==='dark'||(t!=='light'&&m.matches);r.dataset.theme=d?'dark':'light';}
a();m.addEventListener('change',a);window.addEventListener('storage',a);window.__applyTheme=a;
}catch(e){}})()`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

declare global {
  interface Window {
    __applyTheme?: () => void;
  }
}

export function ThemeToggle() {
  const [choice, setChoice] = useState<Choice>("system");

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") setChoice(saved);
  }, []);

  function choose(next: Choice) {
    setChoice(next);
    if (next === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, next);
    window.__applyTheme?.();
  }

  return (
    <select
      aria-label="Theme"
      value={choice}
      onChange={(e) => choose(e.target.value as Choice)}
      className="rounded-[var(--radius-control)] border border-line bg-card px-2 py-1 text-ink"
    >
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
