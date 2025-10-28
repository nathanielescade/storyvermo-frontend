import { absoluteUrl } from '../../../lib/api';
import SignupPageClient from './SignupPageClient';

export async function generateMetadata() {
  const title = 'Sign up — StoryVermo';
  const description = 'Create an account on StoryVermo to share and enjoy stories.';
  const url = absoluteUrl('/signup/');

  return {
    title,
    description,
    openGraph: { title, description, url },
    alternates: { canonical: url }
  };
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-black/60" style={{ paddingTop: '96px' }}>
      <SignupPageClient />
    </div>
  );
}

