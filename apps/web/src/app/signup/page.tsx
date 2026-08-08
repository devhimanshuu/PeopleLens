import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth/auth-form';
import { AuthShell } from '@/components/auth/auth-shell';

export const metadata: Metadata = {
  title: 'Request Access',
  description:
    'Create your PeopleLens enterprise account and start with real-time predictive workforce intelligence.',
};

export default function SignUpPage() {
  return (
    <AuthShell>
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
