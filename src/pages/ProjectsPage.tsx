import { Link } from 'react-router-dom';
import { IconRocket } from '@tabler/icons-react';
import { ProjectDashboard } from '@/features/projects/components/ProjectDashboard';

export default function ProjectsPage() {
  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-eyebrow">Projects</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Your projects</h1>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            Tokens you have registered for distribution, their review status, and reward settings.
          </p>
        </div>
        <Link
          to="/projects/new"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[linear-gradient(180deg,#22D3EE,#06B6D4)] px-5 text-sm font-semibold text-accent-contrast shadow-[0_8px_16px_-12px_rgba(34,211,238,0.5)] hover:brightness-110"
        >
          <IconRocket size={16} stroke={1.8} /> Register a project
        </Link>
      </header>
      <ProjectDashboard />
    </div>
  );
}
