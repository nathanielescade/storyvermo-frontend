import { absoluteUrl } from '../../../lib/api';
import LoginPageClient from './LoginPageClient';

export async function generateMetadata() {
  const title = 'Login — StoryVermo';
  const description = 'Log in to StoryVermo and dive into a world of creative stories, shared moments, and vibrant communities.';

  const url = absoluteUrl('/login/');

  return {
    title,
    description,
    openGraph: { title, description, url },
    alternates: { canonical: url }
  };
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-black/60" style={{ paddingTop: '96px' }}>
      <LoginPageClient />
    </div>
  );
}
