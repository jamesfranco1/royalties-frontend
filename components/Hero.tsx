"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="min-h-screen flex items-center relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-px bg-black w-full"
              style={{ top: `${(i + 1) * 5}%` }}
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.5, delay: i * 0.05, ease: "easeOut" }}
            />
          ))}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={`v-${i}`}
              className="absolute w-px bg-black h-full"
              style={{ left: `${(i + 1) * 5}%` }}
              initial={{ scaleY: 0, originY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 1.5, delay: i * 0.05, ease: "easeOut" }}
            />
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24 w-full relative z-10">
        <div className="max-w-3xl">
          {/* Left side - Content */}
          <div className="flex flex-col justify-center">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "80px" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-1 bg-black mb-8"
            />
            
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]"
            >
              Buy and sell creator royalties on-chain.
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              className="mt-8 text-xl md:text-2xl text-black/60 max-w-xl"
            >
              Creators tokenize future revenue. Investors earn passive income. Trade freely on the secondary market.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
              className="mt-12 flex flex-col sm:flex-row gap-4"
            >
              <Link
                href="/sell"
                className="group inline-flex items-center justify-center px-8 py-4 bg-black text-white font-medium text-lg hover:bg-black/80 transition-all duration-300 hover:translate-x-1"
              >
                Get Started
                <motion.span
                  className="ml-2 inline-block"
                  initial={{ x: 0 }}
                  whileHover={{ x: 4 }}
                >
                  →
                </motion.span>
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-black text-black font-medium text-lg hover:bg-black hover:text-white transition-all duration-300"
              >
                Explore Marketplace
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
