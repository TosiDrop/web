import { Link } from 'react-router-dom';
import { buttonClassName } from '@/lib/button';
import { UmbrellaMark } from '@/components/icons/UmbrellaMark';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <UmbrellaMark className="h-12 w-12 opacity-60" stroke="#DCCFA8" strokeWidth={2.4} />
      <p className="label-eyebrow mt-6">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
        There's nothing here
      </h1>
      <p className="mt-2 max-w-sm text-sm text-text-muted">
        The page you're looking for doesn't exist or has moved.
      </p>
      <Link to="/" className={buttonClassName('primary', 'md', 'mt-6')}>
        Back to claim
      </Link>
    </div>
  );
}
