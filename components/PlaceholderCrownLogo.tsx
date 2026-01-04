"use client";

import Image from "next/image";

interface PlaceholderCrownLogoProps {
  size?: number;
}

export default function PlaceholderCrownLogo({ size = 40 }: PlaceholderCrownLogoProps) {
  return (
    <Image 
      src="/newlogo.jpg" 
      alt="royalties.fun logo" 
      width={size} 
      height={size}
      className="rounded"
    />
  );
}
