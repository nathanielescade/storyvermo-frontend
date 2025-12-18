// components/header/Logo.jsx
import Link from 'next/link';
import Image from 'next/image';

const Logo = () => {
  return (
    <Link href="/" className="hover:opacity-80 transition-opacity">
      <picture>
        <source srcSet="/storyvermo_logo.webp" type="image/webp" />
        <Image 
          src="/storyvermo_logo.png" 
          alt="StoryVermo"
          width={56}
          height={48}
          className="h-12 w-14"
          priority
          quality={90}
          loading="eager"
          fetchPriority="high"
        />
      </picture>
    </Link>
  );
};

export default Logo;