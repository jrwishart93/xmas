export type LeaderboardEntry = {
  name: string;
  amount: string;
};

type LeaderboardProps = {
  entries: LeaderboardEntry[];
  totalFund: string;
};

export default function Leaderboard({ entries, totalFund }: LeaderboardProps) {
  return (
    <section className="leaderboard-panel" aria-label="Team fund summary">
      <p className="leaderboard-total">
        Team Fund Total: <strong>{totalFund}</strong>
      </p>
      <h2 className="leaderboard-heading">Leaderboard (Top 5 · Last 90 Days)</h2>
      <ol className="leaderboard-list">
        {entries.slice(0, 5).map((entry) => (
          <li key={`${entry.name}-${entry.amount}`} className="leaderboard-item">
            <span>{entry.name}</span>
            <strong>{entry.amount}</strong>
          </li>
        ))}
      </ol>
    </section>
  );
}
