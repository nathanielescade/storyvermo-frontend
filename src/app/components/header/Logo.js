// components/header/Logo.jsx
import Link from 'next/link';
import Image from 'next/image';

const Logo = () => {
  return (
    <Link href="/" className="hover:opacity-80 transition-opacity">
      <Image 
        src="/storyvermo_logo.png" 
        alt="StoryVermo"
        width={56}
        height={48}
        className="h-12 w-14"
        priority
        quality={90}
        loading="eager"
      />
    </Link>
  );
};

export default Logo;