import { DashboardCard, type DashboardCardItem } from "./DashboardCard";
import { WorkspaceSidebar, type WorkspaceMenuSection } from "./WorkspaceSidebar";

type WorkspaceModule = {
  label: string;
  title: string;
  description: string;
};

type WorkspaceShellProps = {
  variant: "member" | "pe";
  brandLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  statusTitle: string;
  statusText: string;
  menuSections: ReadonlyArray<WorkspaceMenuSection>;
  backLink: {
    href: string;
    label: string;
  };
  cards: ReadonlyArray<DashboardCardItem>;
  modules: ReadonlyArray<WorkspaceModule>;
};

export function WorkspaceShell({
  backLink,
  brandLabel,
  cards,
  description,
  eyebrow,
  menuSections,
  modules,
  statusText,
  statusTitle,
  title,
  variant,
}: WorkspaceShellProps) {
  return (
    <main className={`workspace-shell workspace-shell-${variant}`}>
      <WorkspaceSidebar brandLabel={brandLabel} homeHref="/" menuSections={menuSections} backLink={backLink} />

      <section className="workspace-content">
        <header className="workspace-topbar">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </header>

        <div className="workspace-status-band">
          <strong>{statusTitle}</strong>
          <span>{statusText}</span>
        </div>

        <div className="workspace-card-grid">
          {cards.map((card) => (
            <DashboardCard key={card.label} {...card} />
          ))}
        </div>

        <div className="workspace-module-grid">
          {modules.map((module) => (
            <article id={module.label} className="workspace-module-card" key={module.label}>
              <span>{module.label}</span>
              <h2>{module.title}</h2>
              <p>{module.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
