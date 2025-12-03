"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Hero from "@/components/Hero";

// Section wrapper component for full-viewport sections
function FullSection({ 
  children, 
  className = "",
  id
}: { 
  children: React.ReactNode; 
  className?: string;
  id?: string;
}) {
  return (
    <section 
      id={id}
      className={`min-h-screen flex flex-col justify-center relative ${className}`}
    >
      {children}
    </section>
  );
}

// Animated text that reveals word by word
function AnimatedHeadline({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20%" });
  const words = text.split(" ");

  return (
    <h2 ref={ref} className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: i * 0.1 }}
          className="inline-block mr-[0.25em]"
        >
          {word}
        </motion.span>
      ))}
    </h2>
  );
}

const explanationCards = [
  {
    number: "01",
    title: "What are Royalties?",
    description:
      "Royalties are contractual rights to a share of future revenue. When you buy a royalty token, you gain legal ownership of a percentage of a creator's earnings.",
  },
  {
    number: "02",
    title: "Why Creators Sell",
    description:
      "Creators sell future revenue to raise upfront capital today. Fund a new project, cover production costs, or unlock liquidity without giving up creative control.",
  },
  {
    number: "03",
    title: "Why Investors Buy",
    description:
      "Investors buy royalties to participate in a creator's success. Earn passive income from revenue streams, speculate on future earnings, or trade tokens.",
  },
];

const howItWorksSteps = [
  { step: "01", title: "Verify", description: "Creator verifies identity and connects revenue accounts" },
  { step: "02", title: "Issue", description: "Creator issues a royalty contract with terms" },
  { step: "03", title: "Buy", description: "Investors purchase royalty tokens with USDC" },
  { step: "04", title: "Mint", description: "NFT receipt minted linking to legal contract" },
  { step: "05", title: "Report", description: "Creator reports revenue through the platform" },
  { step: "06", title: "Earn", description: "Token holders receive their share of revenue" },
  { step: "07", title: "Trade", description: "Tokens can be resold on secondary market" },
];


export default function Home() {
  // Section refs for animations
  const section2Ref = useRef(null);
  const section3Ref = useRef(null);
  const section4Ref = useRef(null);
  const section5Ref = useRef(null);

  const section2InView = useInView(section2Ref, { once: true, margin: "-30%" });
  const section3InView = useInView(section3Ref, { once: true, margin: "-30%" });
  const section4InView = useInView(section4Ref, { once: true, margin: "-30%" });
  const section5InView = useInView(section5Ref, { once: true, margin: "-30%" });

  return (
    <div className="bg-white">
      {/* Section 1: Hero */}
      <Hero />

      {/* Section 2: Understanding Royalties */}
      <FullSection className="border-t border-black" id="understanding">
        <div ref={section2Ref} className="max-w-7xl mx-auto px-6 lg:px-8 py-24 w-full">
          <AnimatedHeadline
            text="A new financial primitive for the creator economy."
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] max-w-4xl mb-16"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {explanationCards.map((card, index) => (
              <motion.div
                key={card.number}
                initial={{ opacity: 0, y: 60 }}
                animate={section2InView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.7, delay: 0.3 + index * 0.15 }}
                className="group"
              >
                <div className="border-t-2 border-black pt-6">
                  <span className="text-6xl font-bold text-black/10 group-hover:text-black/20 transition-colors">
                    {card.number}
                  </span>
                  <h3 className="text-xl font-bold mt-4 mb-3">{card.title}</h3>
                  <p className="text-black/60 leading-relaxed">{card.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Decorative line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={section2InView ? { scaleX: 1 } : {}}
            transition={{ duration: 1, delay: 0.8 }}
            className="h-px bg-black/10 mt-16 origin-left"
          />
        </div>
      </FullSection>

      {/* Section 3: How It Works */}
      <FullSection className="bg-black text-white" id="how-it-works">
        <div ref={section3Ref} className="max-w-7xl mx-auto px-6 lg:px-8 py-24 w-full">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={section3InView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] max-w-3xl mb-16"
          >
            From creation to trading.
          </motion.h2>

          {/* Timeline-style steps */}
          <div className="relative">
            {/* Connecting line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={section3InView ? { scaleX: 1 } : {}}
              transition={{ duration: 1.5, delay: 0.3 }}
              className="absolute top-8 left-0 right-0 h-px bg-white/20 origin-left hidden lg:block"
            />

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
              {howItWorksSteps.map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 40 }}
                  animate={section3InView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                  className="relative"
                >
                  {/* Step indicator */}
                  <div className="w-16 h-16 border border-white/30 flex items-center justify-center mb-4 relative z-10 bg-black">
                    <span className="text-xl font-bold">{item.step}</span>
                  </div>
                  <h3 className="font-bold mb-2">{item.title}</h3>
                  <p className="text-white/50 text-sm">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* CTA within section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={section3InView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 1 }}
            className="mt-16 flex gap-4"
          >
            <Link
              href="/sell"
              className="px-8 py-4 bg-white text-black font-medium hover:bg-white/90 transition-colors"
            >
              Start Selling
            </Link>
            <Link
              href="/marketplace"
              className="px-8 py-4 border border-white font-medium hover:bg-white hover:text-black transition-colors"
            >
              Browse Marketplace
            </Link>
          </motion.div>
        </div>
      </FullSection>

      {/* Section 4: Leaderboard */}
      <FullSection className="border-t border-black" id="leaderboard">
        <div ref={section4Ref} className="max-w-7xl mx-auto px-6 lg:px-8 py-24 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Left: Text */}
            <div>
              <motion.h2
                initial={{ opacity: 0, y: 30 }}
                animate={section4InView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-8"
              >
                Join the leaders.
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={section4InView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-xl text-black/60 mb-8"
              >
                Track creator performance and discover opportunities on the leaderboard.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={section4InView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Link
                  href="/leaderboard"
                  className="inline-flex items-center gap-2 text-lg font-medium group"
                >
                  View Leaderboard
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              </motion.div>
            </div>

            {/* Right: Coming Soon */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={section4InView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex items-center justify-center"
            >
              <div className="border border-black p-12 text-center">
                <p className="text-4xl font-bold mb-4">Leaderboard</p>
                <p className="text-black/60">Rankings based on real on-chain activity</p>
                <Link
                  href="/leaderboard"
                  className="inline-block mt-6 px-6 py-3 bg-black text-white font-medium hover:bg-black/80 transition-colors"
                >
                  View Rankings
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </FullSection>

      {/* Section 5: Final CTA */}
      <FullSection className="border-t border-black" id="cta">
        <div ref={section5Ref} className="max-w-7xl mx-auto px-6 lg:px-8 py-24 w-full text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={section5InView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8 }}
          >
            {/* Large statement */}
            <motion.h2
              initial={{ opacity: 0, y: 40 }}
              animate={section5InView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-8"
            >
              The future of<br />creator financing.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={section5InView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-xl md:text-2xl text-black/60 max-w-2xl mx-auto mb-12"
            >
              Join creators and investors using royalties.fun to unlock new opportunities.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={section5InView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link
                href="/sell"
                className="inline-flex items-center justify-center px-10 py-5 bg-black text-white font-medium text-lg hover:bg-black/80 transition-all duration-300 hover:translate-y-[-2px]"
              >
                Sell Royalties
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center px-10 py-5 border-2 border-black text-black font-medium text-lg hover:bg-black hover:text-white transition-all duration-300"
              >
                Explore Marketplace
              </Link>
            </motion.div>

          </motion.div>
        </div>
      </FullSection>
    </div>
  );
}
