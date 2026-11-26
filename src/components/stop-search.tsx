"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type KeyboardEvent } from "react";

import { useStopSearch } from "@/lib/queries";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { Stop } from "@/lib/vvo/types";

/**
 * Search box with suggestions while typing (an ARIA "combobox").
 * Keyboard: ↓/↑ move through suggestions, Enter opens one, Escape closes the list.
 */
export function StopSearch() {
  const router = useRouter();
  const id = useId();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const query = useDebouncedValue(text.trim(), 250);
  const { data, isFetching, isError, error } = useStopSearch(query);

  const tooShort = text.trim().length < 2;
  const stops: Stop[] = tooShort ? [] : (data?.stops ?? []);
  const settled = !isFetching && query === text.trim();
  const showList = open && !tooShort;

  function choose(stop: Stop) {
    setOpen(false);
    router.push(`/stops/${stop.id}`);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (stops.length ? (i + 1) % stops.length : -1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (stops.length ? (i - 1 + stops.length) % stops.length : -1));
    } else if (event.key === "Enter") {
      const stop = stops[active] ?? (stops.length > 0 ? stops[0] : undefined);
      if (stop) {
        event.preventDefault();
        choose(stop);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  const listId = `${id}-list`;
  const optionId = (index: number) => `${id}-option-${index}`;

  return (
    <div className="relative">
      <label htmlFor={`${id}-input`} className="sr-only">
        Stop name
      </label>
      <div className="flex items-center rounded-lg border-2 border-ink bg-surface focus-within:border-action focus-within:ring-2 focus-within:ring-action">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" className="ml-4 shrink-0 text-muted">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <input
          id={`${id}-input`}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          placeholder="Postplatz, Albertplatz, Hauptbahnhof …"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="w-full bg-transparent px-3 py-3.5 text-xl outline-none placeholder:text-muted/70 focus-visible:outline-none"
        />
        {isFetching && (
          <span className="mr-4 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-muted border-t-transparent" aria-hidden="true" />
        )}
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching stops"
          className="absolute inset-x-0 top-full z-20 mt-2 max-h-[22rem] overflow-y-auto rounded-lg border border-rule bg-surface py-1 shadow-[0_12px_32px_-12px_rgb(0_0_0/0.35)]"
        >
          {stops.map((stop, index) => (
            <li
              key={stop.id}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              // onMouseDown instead of onClick: it fires before the input's blur closes the list.
              onMouseDown={(event) => {
                event.preventDefault();
                choose(stop);
              }}
              onMouseEnter={() => setActive(index)}
              className={`flex cursor-pointer items-baseline justify-between gap-3 px-4 py-2.5 ${index === active ? "bg-action text-action-ink" : ""}`}
            >
              <span lang="de" className="text-lg font-medium">
                {stop.name}
              </span>
              {stop.city && <span className={`text-sm ${index === active ? "" : "text-muted"}`}>{stop.city}</span>}
            </li>
          ))}
          {stops.length === 0 && (
            <li role="presentation" className="px-4 py-3 text-muted">
              {isError
                ? error.message
                : settled
                  ? `No stops match “${text.trim()}”. Check the spelling, or try part of the name.`
                  : "Searching …"}
            </li>
          )}
        </ul>
      )}
      <p className="sr-only" aria-live="polite">
        {showList && settled && !isError ? `${stops.length} stops found` : ""}
      </p>
    </div>
  );
}
