import styles from "@/components/Leaderboard.module.css";

export type LeaderboardEntry = {
  name: string;
  amount: string;
};

type LeaderboardProps = {
  entries: LeaderboardEntry[];
  totalFund: string;
};

const rankClass = [styles.rankGold, styles.rankSilver, styles.rankBronze];

export default function Leaderboard({ entries, totalFund }: LeaderboardProps) {
  const top5 = entries.slice(0, 5);

  return (
    <section className={styles.panel} aria-label="Team fund summary">
      <p className={styles.total}>
        Team Fund Total
        <strong className={styles.totalValue}>{totalFund}</strong>
      </p>

      <p className={styles.heading}>Leaderboard · Top 5 · Last 90 days</p>

      <ol className={styles.list}>
        {top5.map((entry, index) => (
          <li key={`${entry.name}-${entry.amount}`} className={styles.item}>
            <span
              className={`${styles.rank} ${rankClass[index] ?? styles.rankDefault}`}
              aria-label={`Rank ${index + 1}`}
            >
              {index + 1}
            </span>
            <span className={styles.name}>{entry.name}</span>
            <strong className={styles.amount}>{entry.amount}</strong>
          </li>
        ))}
      </ol>
    </section>
  );
}
