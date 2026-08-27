import Link from "next/link";

export default function NotFound() {
  return <div className="page-shell empty-state"><span>404</span><h1>That bracket isn’t public.</h1><p>It may still be a private draft, or the link may be incorrect.</p><Link href="/brackets" className="button">Browse public brackets</Link></div>;
}
