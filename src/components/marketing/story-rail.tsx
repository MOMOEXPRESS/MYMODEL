"use client";

type Chapter = {
  time: string;
  title: string;
  body: string;
  accent: string;
};

export function StoryRail({ chapters }: { chapters: Chapter[] }) {
  return (
    <section className="relative mx-auto max-w-[72rem] px-5 sm:px-8 py-24 lg:py-36">
      <div className="max-w-2xl">
        <p className="mk-eyebrow mb-5">One day on LuxLane</p>
        <h2 className="mk-display text-3xl sm:text-4xl lg:text-[2.75rem] leading-[1.08]">
          Not another dashboard.
          <span className="block text-[var(--mk-muted)] mt-1">A rhythm everyone feels.</span>
        </h2>
      </div>
      <div className="mt-20 lg:mt-28 grid lg:grid-cols-[1px_1fr] gap-12 lg:gap-20">
        <div className="hidden lg:block mk-story-line mx-auto min-h-full" aria-hidden />
        <ol className="space-y-24 lg:space-y-32">
          {chapters.map((ch, i) => (
            <StoryChapter key={ch.time} chapter={ch} index={i} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function StoryChapter({ chapter, index }: { chapter: Chapter; index: number }) {
  return (
    <li className="relative">
      <span
        className="lg:absolute lg:-left-[calc(2.5rem+1px)] lg:top-0 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--mk-line)] text-[10px] font-mono text-[var(--mk-muted)] bg-[var(--mk-bg)]"
        aria-hidden
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--mk-warm)] mb-3">
        {chapter.time}
      </p>
      <h3 className="mk-display text-xl sm:text-2xl text-[var(--mk-ink)]">{chapter.title}</h3>
      <p className="mt-4 text-[var(--mk-muted)] leading-[1.7] max-w-lg text-[15px]">{chapter.body}</p>
    </li>
  );
}
