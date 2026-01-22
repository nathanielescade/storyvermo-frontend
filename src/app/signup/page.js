import { absoluteUrl, siteUrl } from '../../../lib/api';
import SignupPageClient from './SignupPageClient';

export async function generateMetadata() {
  const title = 'Sign up — StoryVermo';
const description = 'Create your StoryVermo account to share your stories, discover new voices, and connect with creative minds.';

  const url = siteUrl('/signup/');

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

