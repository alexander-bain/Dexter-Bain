import { BracketBuilder } from "@/components/BracketBuilder";

export const metadata = { title: "Build your bracket" };

export default function CreatePage() {
  return (
    <div className="builder-page">
      <section className="page-intro page-shell">
        <div className="eyebrow"><span /> Bracket workshop</div>
        <h1>Make every pick.</h1>
        <p>Choose a winner in all 127 matches per draw. Tap a name to advance it; changing an early pick safely clears any dependent choices.</p>
      </section>
      <BracketBuilder />
    </div>
  );
}
