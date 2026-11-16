import { Link } from 'react-router-dom';
import { IconRocket } from '@tabler/icons-react';
import { buttonClassName } from '@/lib/button';
import { ProjectDashboard } from '@/features/projects/components/ProjectDashboard';

export default function ProjectsPage() {
  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Your tokens</h1>
          <p className="mt-2 max-w-md text-sm text-text-muted">
            Tokens you have registered for distribution, their review status, and reward settings.
          </p>
        </div>
        <Link
          to="/projects/new"
          className={buttonClassName('primary')}
        >
          <IconRocket size={16} stroke={1.8} /> Register a token
        </Link>
      </header>
      <ProjectDashboard />
    </div>
  );
}
