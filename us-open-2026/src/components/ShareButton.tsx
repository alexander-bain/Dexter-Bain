"use client";

export function ShareButton({ title }: { title: string }) {
  async function share() {
    if (navigator.share) await navigator.share({ title, url: window.location.href });
    else await navigator.clipboard.writeText(window.location.href);
  }
  return <button className="button button-quiet" onClick={share}>Share bracket</button>;
}
