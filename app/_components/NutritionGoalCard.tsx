import type { NutritionGoal } from "./workspaceTypes";
import styles from "./WorkspaceShell.module.css";

type NutritionGoalCardProps = {
  goals: readonly NutritionGoal[];
  note: string;
};

export function NutritionGoalCard({ goals, note }: NutritionGoalCardProps) {
  const [totalGoal, ...macroGoals] = goals;

  return (
    <section className={styles.nutritionCard} aria-labelledby="nutrition-title">
      <div className={styles.sectionCardHeader}>
        <div>
          <p className={styles.sectionEyebrow}>NUTRITION</p>
          <h2 id="nutrition-title">영양 목표</h2>
        </div>
        {totalGoal && (
          <p className={styles.totalGoal}>
            <span>{totalGoal.label}</span>
            <strong>{totalGoal.value}</strong>
            {totalGoal.unit && <em>{totalGoal.unit}</em>}
          </p>
        )}
      </div>
      <div className={styles.macroGrid}>
        {macroGoals.map((goal) => (
          <div className={styles.macroItem} key={goal.label}>
            <span>{goal.label}</span>
            <strong>{goal.value}</strong>
            {goal.unit && <em>{goal.unit}</em>}
          </div>
        ))}
      </div>
      <p className={styles.nutritionNote}>{note}</p>
    </section>
  );
}
