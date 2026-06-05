import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center">
        <p className="text-8xl font-bold text-muted-foreground/20">404</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">Page not found</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/">
            <Button className="rounded-lg">Go Home</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" className="rounded-lg">Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}