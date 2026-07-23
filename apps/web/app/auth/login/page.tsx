import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { GoogleSignInButton } from '@/features/auth';
import { getServerAuthUser } from '@/lib/auth/server-auth';
import { Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sign in | LaunchLens',
  robots: { index: false, follow: false },
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params.next ?? '/dashboard';
  const user = await getServerAuthUser();

  if (user) {
    redirect(next.startsWith('/') ? next : '/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-black/[0.06] bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-900 text-white">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">LaunchLens</h1>
            <p className="text-sm text-zinc-500">AI Strategy Consultant</p>
          </div>
        </div>

        <p className="mt-8 text-sm leading-relaxed text-zinc-600">
          Google 계정으로 로그인하고 5분 안에 첫 프로젝트를 시작하세요.
        </p>

        {params.error ? (
          <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            로그인에 실패했습니다. 다시 시도해 주세요.
          </p>
        ) : null}

        <div className="mt-6">
          <GoogleSignInButton redirectTo={next} className="h-11 w-full rounded-xl" />
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500">
          데모만 보고 싶다면{' '}
          <Link href="/demo/enter" className="font-medium text-zinc-900 underline-offset-2 hover:underline">
            Demo Workspace
          </Link>
          로 이동하세요.
        </p>
      </div>
    </div>
  );
}
