import Link from "next/link";

export type WorkspaceMenuSection = {
  title: string;
  items: ReadonlyArray<{
    label: string;
    href: string;
  }>;
};

type WorkspaceSidebarProps = {
  brandLabel: string;
  homeHref: string;
  menuSections: ReadonlyArray<WorkspaceMenuSection>;
  backLink: {
    href: string;
    label: string;
  };
};

export function WorkspaceSidebar({ backLink, brandLabel, homeHref, menuSections }: WorkspaceSidebarProps) {
  return (
    <aside className="workspace-sidebar">
      <Link href={homeHref} className="workspace-brand" aria-label="RePERFORMANCE 홈">
        <strong>RePERFORMANCE</strong>
        <span>{brandLabel}</span>
      </Link>
      <nav aria-label={`${brandLabel} 메뉴`}>
        {menuSections.map((section) => (
          <div className="workspace-menu-section" key={section.title}>
            <p>{section.title}</p>
            {section.items.map((item) => (
              <a href={item.href} key={`${section.title}-${item.label}`}>
                {item.label}
              </a>
            ))}
          </div>
        ))}
      </nav>
      <Link href={backLink.href} className="workspace-back-link">
        {backLink.label}
      </Link>
    </aside>
  );
}
