import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { landing } from '@/content/landing';
import { altFor } from '@/content/alts';
import { image, hasImage } from '@/lib/images';
import type { Mode } from '@/lib/mode';

gsap.registerPlugin(ScrollTrigger);

interface Props {
  mode: Mode;
}

const chapterIndex = new Map(landing.chapters.map((c, i) => [c.id, i + 1]));

export function Article({ mode }: Props) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still || !root.current) return;

    const ctx = gsap.context(() => {
      const targets = gsap.utils.toArray<HTMLElement>('[data-reveal]');
      if (targets.length) {
        gsap.set(targets, { opacity: 0, y: mode === 'accessible' ? 0 : 44 });
        ScrollTrigger.batch(targets, {
          start: 'top 90%',
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, {
              opacity: 1,
              y: 0,
              duration: 0.7,
              ease: 'power2.out',
              stagger: 0.08,
              overwrite: true,
            }),
        });
      }

      // Подсветка текущей главы в оглавлении — состояние, а не анимация.
      document.querySelectorAll<HTMLAnchorElement>('[data-chapter]').forEach((link) => {
        const target = link.dataset.chapter
          ? document.getElementById(link.dataset.chapter)
          : null;
        if (!target) return;
        ScrollTrigger.create({
          trigger: target,
          start: 'top center',
          end: 'bottom center',
          onToggle: (self) =>
            link.setAttribute('aria-current', self.isActive ? 'true' : 'false'),
        });
      });
    }, root);

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    void document.fonts?.ready.then(refresh);

    return () => {
      window.removeEventListener('load', refresh);
      ctx.revert();
    };
  }, [mode]);

  const hero = landing.blocks.find((b) => b.id === 'hero');
  const intro = landing.blocks.find((b) => b.id === 'intro');
  const rest = landing.blocks.filter((b) => !['hero', 'intro', 'nav'].includes(b.id));
  const heroImage = hero?.images.find(hasImage);

  return (
    <main ref={root} id="main" tabIndex={-1} className="pb-40">
      {heroImage && (
        <section className="shell pt-6" aria-label="Обложка материала">
          <img
            src={image(heroImage)}
            alt={altFor(heroImage) ?? ''}
            className="aspect-video w-full rounded-frame object-cover"
          />
        </section>
      )}

      <section className="shell py-[clamp(2.5rem,6vw,7rem)]">
        <p className="mb-5 text-[length:var(--fs-ui)] font-bold uppercase tracking-[0.18em] opacity-60">
          Esquire × ASBIS
        </p>
        <h1
          data-reveal
          className="max-w-[22ch] text-[length:var(--fs-display)] font-bold leading-[1.03] tracking-tight"
        >
          {intro?.title}
        </h1>
        {intro?.paragraphs.map((p) => (
          <p
            key={p.id}
            data-speech={p.id}
            data-reveal
            className="measure mt-8 text-[length:var(--fs-lead)]"
          >
            {p.text}
          </p>
        ))}
      </section>

      <nav className="shell pb-[clamp(2.5rem,6vw,6rem)]" aria-label="Оглавление">
        <ol className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {landing.chapters.map((c, i) => (
            <li key={c.id}>
              <a
                href={`#${c.id}`}
                data-chapter={c.id}
                className="group flex h-full flex-col gap-3 rounded-card border-2 border-ink/15 p-5 no-underline transition-colors hover:border-ink focus-visible:border-ink aria-[current=true]:border-ink"
              >
                {c.image && hasImage(c.image) && (
                  <img
                    src={image(c.image)}
                    alt=""
                    className="aspect-[4/3] w-full rounded-[14px] object-cover"
                  />
                )}
                <span className="text-[length:var(--fs-ui)] tabular-nums opacity-55">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[length:var(--fs-body)] font-bold leading-tight">
                  {c.title}
                </span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {rest.map((block) => {
        const cap = block.caption;
        const capId = cap && hasImage(cap.imageId) ? cap.imageId : undefined;
        const pics = block.images.filter((id) => hasImage(id) && id !== capId);
        const isChapter = block.kind === 'chapter';
        const isQuote = block.kind === 'quote' || block.kind === 'body';
        const num = chapterIndex.get(block.id);

        return (
          <section key={block.id} className="shell py-[clamp(2rem,5vw,5.5rem)]">
            {isChapter && block.title && (
              <header className="mb-10 flex items-baseline gap-5">
                {num && (
                  <span
                    aria-hidden="true"
                    className="text-[length:var(--fs-display)] font-bold leading-none tabular-nums opacity-15"
                  >
                    {String(num).padStart(2, '0')}
                  </span>
                )}
                <h2
                  id={block.id}
                  data-reveal
                  className="max-w-[18ch] scroll-mt-24 text-[length:var(--fs-display)] font-bold leading-[1.05] tracking-tight"
                >
                  {block.title}
                </h2>
              </header>
            )}

            {capId && cap && (
              <figure className="mb-10">
                <img
                  src={image(capId)}
                  alt={altFor(capId) ?? ''}
                  className="aspect-[16/9] w-full rounded-frame object-cover"
                />
                <figcaption
                  id={isChapter ? block.id : undefined}
                  data-reveal
                  className="measure mt-6 scroll-mt-24 text-[length:var(--fs-display)] font-bold leading-[1.06] tracking-tight"
                >
                  {cap.text}
                </figcaption>
              </figure>
            )}

            {isQuote && block.title && !capId && (
              <blockquote data-reveal className="my-10 border-l-4 border-ink pl-6">
                <p className="max-w-[20ch] text-[length:var(--fs-display)] font-bold leading-[1.06] tracking-tight">
                  {block.title}
                </p>
              </blockquote>
            )}

            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-start">
              <div className="grid gap-6">
                {block.paragraphs.map((p) => (
                  <p key={p.id} data-speech={p.id} data-reveal className="measure">
                    {p.text}
                  </p>
                ))}
              </div>

              {pics.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  {pics.slice(0, 3).map((id) => (
                    <img
                      key={id}
                      src={image(id)}
                      alt={altFor(id) ?? ''}
                      data-reveal
                      className="aspect-[4/3] w-full rounded-card object-cover"
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </main>
  );
}
