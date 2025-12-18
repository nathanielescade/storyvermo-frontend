"use client";

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

export default function LazyImage(props) {
  const { src, alt, className, quality = 60, sizes, fill, width, height, priority = false, fetchPriority, loading } = props;
  const ref = useRef(null);
  const [visible, setVisible] = useState(Boolean(priority));

  useEffect(() => {
    if (visible) return;
    if (!ref.current) return;

    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisible(true);
        io.disconnect();
      }
    }, { rootMargin: '400px' });

    io.observe(ref.current);

    return () => io.disconnect();
  }, [visible]);

  // If priority (LCP), render immediately
  if (visible) {
    return (
      <Image
        src={src}
        alt={alt}
        className={className}
        quality={quality}
        sizes={sizes}
        fill={fill}
        width={width}
        height={height}
        priority={priority}
        fetchPriority={fetchPriority}
        loading={loading}
      />
    );
  }

  // Placeholder element to be observed
  return (
    <div ref={ref} style={{ width: width || '100%', height: height || '100%' }} className={className} aria-hidden="true" />
  );
}
