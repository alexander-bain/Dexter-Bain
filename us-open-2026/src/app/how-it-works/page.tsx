export const metadata = { title: "How it works" };

export default function HowItWorksPage() {
  return (
    <div className="page-shell prose-page">
      <div className="eyebrow"><span /> Rules & scoring</div>
      <h1>Simple picks.<br /><em>Serious scoring.</em></h1>
      <div className="prose-grid">
        <section><h2>Build both draws</h2><p>Advance one player in every match in the men’s and women’s singles draws. Drafts save to your secure browser identity, and you can resume on the same browser.</p></section>
        <section><h2>Submit before the lock</h2><p>A bracket becomes public only after you submit it. You may still edit a submitted bracket until the configured tournament lock time. After that, every pick is read-only.</p></section>
        <section><h2>Earn more in later rounds</h2><p>Each correct winner earns the value of that round. A perfect combined bracket is worth 896 points.</p></section>
        <section><h2>Maximum possible</h2><p>Alongside current points, we show the most your bracket can still earn. A future pick stops contributing once that player is eliminated.</p></section>
      </div>
      <div className="score-table" role="table" aria-label="Points by round">
        {[["Round of 128", 1], ["Round of 64", 2], ["Round of 32", 4], ["Round of 16", 8], ["Quarterfinals", 16], ["Semifinals", 32], ["Final", 64]].map(([name, points]) => (
          <div role="row" key={name}><span role="cell">{name}</span><b role="cell">{points} pts</b></div>
        ))}
      </div>
      <div className="rule-note"><b>Leaderboard tiebreaks</b><span>Combined score, then maximum possible, then correct picks, then earliest submission.</span></div>
    </div>
  );
}
