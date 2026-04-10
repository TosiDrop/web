import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-5xl font-bold text-white">404</h1>
      <p className="mt-2 text-sm text-gray-400">Page not found.</p>
      <Link
        to="/"
        className="mt-4 rounded-md bg-cyan-600 px-4 py-2 text-sm text-white hover:bg-cyan-500"
      >
        Back to Rewards
      </Link>
    </div>
  );
}
