import { Link } from '@tanstack/react-router';
import { projectRegistry } from '../../projects/projectRegistry';
import { ProjectSymbol } from '../ProjectSymbol';
import styles from './ProjectLinks.module.css';

interface ProjectLinksProps {
  /**
   * Optional explicit list of project slugs to render. When omitted, all
   * projects from the registry are shown in registry order.
   */
  ids?: string[];
}

/**
 * Renders a row of links into individual project routes. Used inside slide
 * overlays (notably the closing slide) so the audience can jump directly
 * from the deck into any of the live projects.
 */
export function ProjectLinks({ ids }: ProjectLinksProps) {
  const entries = ids
    ? ids
        .map((id) => projectRegistry.find((p) => p.meta.id === id))
        .filter((entry): entry is (typeof projectRegistry)[number] => Boolean(entry))
    : projectRegistry;

  return (
    <div className={styles.wrap}>
      {entries.map(({ meta }) => (
        <Link
          key={meta.id}
          to="/projects/$projectId"
          params={{ projectId: meta.id }}
          className={styles.link}
        >
          <ProjectSymbol id={meta.id} className={styles.symbol} />
          <span>{meta.title}</span>
        </Link>
      ))}
    </div>
  );
}
