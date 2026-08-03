import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeDollarSign,
  Goal,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users
} from "lucide-react";
import { fundraisingConfig } from "./config";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const numberFormatter = new Intl.NumberFormat("en-US");

function formatCurrency(value: number) {
  return currencyFormatter.format(Math.round(value));
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

function useCountUp(value: number, duration = 1100) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setDisplayValue(value);
      return;
    }

    let frame = 0;
    let startTime: number | null = null;
    const startValue = displayValue;
    const distance = value - startValue;

    function animate(timestamp: number) {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + distance * eased);

      if (progress < 1) {
        frame = window.requestAnimationFrame(animate);
      }
    }

    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [duration, value]);

  return displayValue;
}

type DonateButtonProps = {
  tone?: "hero" | "light";
  label?: string;
  className?: string;
};

function DonateButton({ tone = "hero", label = "DONATE NOW", className = "" }: DonateButtonProps) {
  const isExternalDonationLink = /^https?:\/\//i.test(fundraisingConfig.fundraiserUrl);
  const baseClass =
    "group inline-flex min-h-14 items-center justify-center gap-3 rounded-full px-7 py-4 text-sm font-black uppercase tracking-[0.16em] shadow-xl transition duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300";
  const toneClass =
    tone === "hero"
      ? "bg-sky-600 text-white shadow-sky-800/20 hover:bg-sky-500"
      : "bg-white text-sky-800 shadow-white/20 hover:bg-sky-50";

  return (
    <a
      className={`${baseClass} ${toneClass} ${className}`}
      href={fundraisingConfig.fundraiserUrl}
      target={isExternalDonationLink ? "_blank" : undefined}
      rel={isExternalDonationLink ? "noreferrer" : undefined}
      aria-label="Donate now through the official Make-A-Wish fundraising page"
    >
      {label}
      <ArrowRight className="h-5 w-5 transition duration-300 group-hover:translate-x-1" aria-hidden="true" />
    </a>
  );
}

function AnimatedMoney({ value }: { value: number }) {
  const displayValue = useCountUp(value);
  return <>{formatCurrency(displayValue)}</>;
}

function AnimatedNumber({ value }: { value: number }) {
  const displayValue = useCountUp(value);
  return <>{numberFormatter.format(Math.round(displayValue))}</>;
}

function SectionHeading({
  eyebrow,
  title,
  tone = "light",
  children
}: {
  eyebrow: string;
  title: string;
  tone?: "light" | "dark";
  children?: React.ReactNode;
}) {
  const titleClass = tone === "dark" ? "text-white" : "text-slate-950";
  const copyClass = tone === "dark" ? "text-slate-300" : "text-slate-600";

  return (
    <div className="mx-auto mb-10 max-w-3xl text-center">
      <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-amber-600">{eyebrow}</p>
      <h2 className={`text-3xl font-black sm:text-4xl ${titleClass}`}>{title}</h2>
      {children ? <p className={`mt-4 text-lg leading-8 ${copyClass}`}>{children}</p> : null}
    </div>
  );
}

function App() {
  const raised = fundraisingConfig.raised;
  const goal = fundraisingConfig.goal;
  const percent = useMemo(() => clampPercent((raised / goal) * 100), [goal, raised]);
  const percentLabel = `${Math.round(percent)}%`;

  const whyDonateCards = [
    {
      icon: HeartHandshake,
      title: "Every Donation Matters",
      copy: "Every dollar helps create unforgettable experiences for children."
    },
    {
      icon: ShieldCheck,
      title: "100% Goes to Make-A-Wish",
      copy: "All donations go directly through the official Make-A-Wish fundraising page."
    },
    {
      icon: Sparkles,
      title: "Help Make Dreams Come True",
      copy: "Together we can help grant more wishes."
    }
  ];

  const liveStats = [
    { label: "Current Raised", value: <AnimatedMoney value={raised} />, icon: TrendingUp },
    { label: "Goal", value: formatCurrency(goal), icon: Goal },
    { label: "Percent Complete", value: percentLabel, icon: Star },
    { label: "Number of Donors", value: <AnimatedNumber value={fundraisingConfig.donors} />, icon: Users }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <header
        className="relative isolate min-h-[86svh] overflow-hidden bg-sky-100"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}wish-hero.png)`,
          backgroundPosition: "center",
          backgroundSize: "cover"
        }}
      >
        <div className="absolute inset-0 -z-10 bg-cover bg-center" aria-hidden="true" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white/95 via-white/78 to-white/20" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" aria-hidden="true" />

        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8" aria-label="Primary">
          <a className="inline-flex items-center gap-3 text-slate-950" href="#top" aria-label="Skip for Wishes home">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-sky-700 shadow-lg shadow-sky-900/10">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-base font-black uppercase tracking-[0.18em]">Skip for Wishes</span>
          </a>
          <DonateButton tone="hero" className="hidden sm:inline-flex" />
        </nav>

        <section id="top" className="mx-auto flex max-w-7xl flex-col px-5 pb-20 pt-14 sm:px-8 sm:pb-28 sm:pt-20">
          <div className="reveal max-w-3xl">
            <p className="mb-5 inline-flex rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-sky-800 shadow-sm">
              Dexter Bain fundraiser
            </p>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.02] text-slate-950 sm:text-6xl lg:text-7xl">
              Help Make Wishes Come True
            </h1>
            <p className="mt-7 max-w-2xl text-xl leading-9 text-slate-700 sm:text-2xl">
              Every dollar helps bring hope, strength, and joy to children facing critical illnesses.
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
              <DonateButton tone="hero" className="w-full sm:w-auto" />
              <a
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-slate-300 bg-white/75 px-7 py-4 text-sm font-black uppercase tracking-[0.16em] text-slate-800 transition duration-300 hover:border-sky-300 hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-200"
                href="#progress"
              >
                See Progress
              </a>
            </div>
          </div>
        </section>
      </header>

      <main>
        <section id="progress" className="bg-white px-5 py-18 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <SectionHeading eyebrow="Fundraising progress" title="Raised">
              The campaign is just beginning, and every gift moves the progress bar closer to the goal.
            </SectionHeading>

            <div className="reveal">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-lg border border-sky-100 bg-sky-50 p-6">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-sky-700">Raised</p>
                  <p className="mt-3 break-words text-5xl font-black text-slate-950 sm:text-6xl">
                    <AnimatedMoney value={raised} />
                  </p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-700">Goal</p>
                  <p className="mt-3 break-words text-5xl font-black text-slate-950 sm:text-6xl">
                    {formatCurrency(goal)}
                  </p>
                </div>
              </div>

              <div className="mt-8" aria-label={`${percentLabel} complete`}>
                <div className="mb-3 flex items-center justify-between gap-4 text-sm font-bold text-slate-600">
                  <span>Progress</span>
                  <span>{percentLabel}</span>
                </div>
                <div className="h-5 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-600 via-sky-400 to-amber-400 transition-[width] duration-1000 ease-out"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
              <div className="mt-8 text-center">
                <DonateButton tone="hero" />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-sky-50 px-5 py-18 sm:px-8 sm:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="reveal">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-amber-600">The mission</p>
              <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">About Make-A-Wish</h2>
            </div>
            <div className="reveal space-y-5 text-lg leading-8 text-slate-700">
              <p>
                Make-A-Wish grants life-changing wishes for children with critical illnesses. A wish can give a child
                something joyful to look forward to and a powerful memory to share with their family.
              </p>
              <p>
                Wishes can include meeting heroes, taking special trips, receiving unique experiences, or other
                meaningful dreams. Donations help make those wishes possible.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white px-5 py-18 sm:px-8 sm:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
            <div className="reveal">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-amber-600">Inspiration</p>
              <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">Why John Cena Inspires Me</h2>
              <div className="mt-6 space-y-5 text-lg leading-8 text-slate-700">
                <p>
                  John Cena has granted more Make-A-Wish wishes than any other individual. He has brought joy to
                  hundreds of children and families through kindness, time, and attention.
                </p>
                <p>
                  His generosity inspired me to create this fundraiser and invite more people to help make wishes
                  possible.
                </p>
                <p className="text-base font-semibold text-slate-600">
                  This website is independent and does not imply that John Cena is affiliated with or endorses it.
                </p>
              </div>
            </div>
            <div className="reveal">
              <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-sky-300 bg-slate-50 text-center shadow-xl shadow-slate-950/5">
                <div className="max-w-xs px-6">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                    <Star className="h-8 w-8" aria-hidden="true" />
                  </div>
                  <p className="text-lg font-black text-slate-950">
                    John Cena photo (replace with licensed image if used)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-950 px-5 py-18 text-white sm:px-8 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <SectionHeading eyebrow="Why donate" title="Small gifts can become huge moments" tone="dark">
              A wish is powered by people choosing to help.
            </SectionHeading>
            <div className="grid gap-5 md:grid-cols-3">
              {whyDonateCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article
                    className="reveal rounded-lg border border-white/10 bg-white/[0.06] p-6 shadow-xl shadow-black/20"
                    key={card.title}
                  >
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-amber-300 text-slate-950">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h3 className="text-xl font-black text-white">{card.title}</h3>
                    <p className="mt-3 leading-7 text-slate-300">{card.copy}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-white px-5 py-18 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <SectionHeading eyebrow="Live total" title="Current Campaign Snapshot">
              Follow the campaign as every donation brings the goal closer.
            </SectionHeading>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {liveStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <article className="reveal rounded-lg border border-slate-200 bg-white p-6 shadow-lg shadow-slate-950/5" key={stat.label}>
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">{stat.label}</p>
                    <p className="mt-3 break-words text-3xl font-black text-slate-950">{stat.value}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="official-make-a-wish-fundraiser-link-coming-soon"
          className="bg-sky-700 px-5 py-18 text-white sm:px-8 sm:py-24"
        >
          <div className="reveal mx-auto max-w-4xl text-center">
            <BadgeDollarSign className="mx-auto h-12 w-12 text-amber-300" aria-hidden="true" />
            <h2 className="mt-6 text-3xl font-black sm:text-5xl">Ready to help grant more wishes?</h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-sky-50">
              Donations will go directly through the official Make-A-Wish fundraising page as soon as Dexter adds the
              official link.
            </p>
            <DonateButton tone="light" className="mt-8 w-full sm:w-auto" />
          </div>
        </section>
      </main>

      <footer className="bg-slate-950 px-5 py-10 text-slate-300 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 text-sm leading-7 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-black text-white">Skip for Wishes</p>
            <p className="mt-1">This website was created by Dexter Bain to support the Make-A-Wish Foundation.</p>
          </div>
          <p className="max-w-2xl">
            This website is an independent fundraiser and is not affiliated with or operated by the Make-A-Wish
            Foundation.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
