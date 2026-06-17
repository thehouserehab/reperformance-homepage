export type DashboardCardItem = {
  label: string;
  title: string;
  description: string;
};

export function DashboardCard({ description, label, title }: DashboardCardItem) {
  return (
    <article className="workspace-card">
      <p>{label}</p>
      <strong>{title}</strong>
      <span>{description}</span>
    </article>
  );
}
