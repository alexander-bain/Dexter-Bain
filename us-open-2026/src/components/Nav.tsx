import Link from "next/link";

const links = [
  ["Build", "/create"],
  ["Browse", "/brackets"],
  ["Leaderboard", "/leaderboard"],
  ["How it works", "/how-it-works"],
];

export function Nav() {
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Open Bracket home">
        <span className="brand-mark" aria-hidden>OB</span>
        <span>Open Bracket <small>New York 2026</small></span>
      </Link>
      <nav aria-label="Main navigation">
        {links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
      </nav>
      <Link href="/create" className="button button-small">Create bracket</Link>
    </header>
  );
}
