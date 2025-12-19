// StoryCover.js
import Image from "next/image";

export default function StoryCover({ src, alt }) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority
      fetchPriority="high"
      sizes="100vw"
      className="scene-bg w-full h-full"
    />
  );
}