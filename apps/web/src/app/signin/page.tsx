import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth/auth-form';
import { AuthShell } from '@/components/auth/auth-shell';

export const metadata: Metadata = {
  title: 'Sign In',
  description:
    'Sign in to PeopleLens to access your organization workspace and live workforce intelligence.',
};

export default function SignInPage() {
  return (
    <AuthShell>
      <AuthForm mode="signin" />
    </AuthShell>
  );
}
