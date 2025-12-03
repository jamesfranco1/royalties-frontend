"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import Link from "next/link";

// Animated building block component
function BuildingBlock({ 
  delay, 
  height, 
  width = 60,
  x 
}: { 
  delay: number; 
  height: number;
  width?: number;
  x: number;
}) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height, opacity: 1 }}
      transition={{ 
        duration: 1.2, 
        delay,
        ease: [0.22, 1, 0.36, 1]
      }}
      style={{ width, left: x }}
      className="absolute bottom-0 bg-black origin-bottom"
    >
      {/* Windows */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.8, duration: 0.5 }}
        className="absolute inset-2 grid grid-cols-2 gap-1"
      >
        {Array.from({ length: Math.floor(height / 20) }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: Math.random() > 0.3 ? 0.3 : 0.1 }}
            transition={{ delay: delay + 1 + i * 0.05, duration: 0.3 }}
            className="bg-white h-3"
          />
        ))}
      </motion.div>
    </motion.div>
  );
}

// Floating geometric shapes
function FloatingShape({ 
  size, 
  x, 
  y, 
  delay,
  duration = 20,
  type = "square"
}: { 
  size: number;
  x: string;
  y: string;
  delay: number;
  duration?: number;
  type?: "square" | "circle" | "diamond";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ 
        opacity: [0, 0.1, 0.1, 0],
        scale: [0.8, 1, 1, 0.8],
        y: [0, -30, 0, 30, 0],
        rotate: type === "diamond" ? [45, 45, 45, 45] : [0, 90, 180, 270, 360]
      }}
      transition={{ 
        duration,
        delay,
        repeat: Infinity,
        ease: "linear"
      }}
      style={{ 
        width: size, 
        height: size,
        left: x,
        top: y,
      }}
      className={`absolute border border-black/20 ${type === "circle" ? "rounded-full" : ""}`}
    />
  );
}

// Animated counter
function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  
  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      className="tabular-nums"
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.5 }}
      >
        {value.toLocaleString()}{suffix}
      </motion.span>
    </motion.span>
  );
}

export default function CompaniesPage() {
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const ctaRef = useRef(null);
  
  const heroInView = useInView(heroRef, { once: true });
  const featuresInView = useInView(featuresRef, { once: true, margin: "-20%" });
  const ctaInView = useInView(ctaRef, { once: true, margin: "-20%" });
  
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setEmail("");
    }
  };

  const buildings = [
    { delay: 0.3, height: 180, width: 50, x: 0 },
    { delay: 0.4, height: 240, width: 70, x: 60 },
    { delay: 0.2, height: 140, width: 45, x: 140 },
    { delay: 0.5, height: 300, width: 80, x: 195 },
    { delay: 0.35, height: 200, width: 55, x: 285 },
    { delay: 0.25, height: 160, width: 50, x: 350 },
    { delay: 0.45, height: 260, width: 65, x: 410 },
    { delay: 0.15, height: 120, width: 40, x: 485 },
  ];

  const features = [
    {
      number: "01",
      title: "Revenue Share Contracts",
      description: "Companies sell a percentage of future revenue for upfront capital. No equity dilution, no debt obligations."
    },
    {
      number: "02", 
      title: "Verified Businesses",
      description: "Every company goes through verification. Real businesses, real revenue, real opportunities."
    },
    {
      number: "03",
      title: "Liquid Secondary Market",
      description: "Trade revenue share tokens freely. Enter and exit positions on your terms."
    },
    {
      number: "04",
      title: "Transparent Payouts",
      description: "All revenue reporting and distributions happen on-chain. Full transparency, full accountability."
    }
  ];

  return (
    <div className="bg-white min-h-screen overflow-hidden">
      {/* Hero Section */}
      <section className="min-h-[90vh] flex flex-col justify-center relative border-b border-black">
        {/* Floating shapes background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <FloatingShape size={100} x="5%" y="20%" delay={0} duration={25} type="square" />
          <FloatingShape size={60} x="85%" y="15%" delay={2} duration={30} type="diamond" />
          <FloatingShape size={80} x="90%" y="60%" delay={4} duration={22} type="square" />
          <FloatingShape size={40} x="10%" y="70%" delay={1} duration={28} type="circle" />
          <FloatingShape size={120} x="75%" y="75%" delay={3} duration={35} type="square" />
          <FloatingShape size={50} x="50%" y="10%" delay={5} duration={20} type="diamond" />
        </div>

        <div ref={heroRef} className="max-w-7xl mx-auto px-6 lg:px-8 py-24 w-full relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: Text */}
            <div>
              {/* Coming Soon Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="inline-flex items-center gap-2 mb-8"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-2 h-2 bg-black"
                />
                <span className="text-sm font-medium tracking-widest uppercase">Coming Soon</span>
              </motion.div>

              {/* Main headline */}
              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.95] mb-6"
              >
                Fundraise
                <br />
                <span className="relative">
                  without
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={heroInView ? { scaleX: 1 } : {}}
                    transition={{ duration: 0.8, delay: 0.8 }}
                    className="absolute bottom-2 left-0 right-0 h-3 bg-black/10 -z-10 origin-left"
                  />
                </span>
                <br />
                giving up
                <br />
                equity.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-xl text-black/60 max-w-lg mb-10"
              >
                Small businesses and startups can now raise capital by selling a share of future revenue. 
                Investors get real returns. Founders keep full ownership.
              </motion.p>

              {/* Email signup */}
              <motion.form
                onSubmit={handleSubmit}
                initial={{ opacity: 0, y: 20 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-3 max-w-md"
              >
                {!submitted ? (
                  <>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="flex-1 px-4 py-4 border-2 border-black bg-white text-black placeholder:text-black/40 focus:outline-none focus:bg-black/5 transition-colors"
                      required
                    />
                    <button
                      type="submit"
                      className="px-8 py-4 bg-black text-white font-medium hover:bg-black/80 transition-all duration-300 hover:translate-y-[-2px] whitespace-nowrap"
                    >
                      Get Early Access
                    </button>
                  </>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-3 px-4 py-4 border-2 border-black bg-black text-white"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, delay: 0.1 }}
                      className="w-5 h-5 border-2 border-white flex items-center justify-center"
                    >
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        ✓
                      </motion.span>
                    </motion.div>
                    <span>You're on the list. We'll be in touch.</span>
                  </motion.div>
                )}
              </motion.form>
            </div>

            {/* Right: Animated City Skyline */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={heroInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="relative h-[400px] hidden lg:block"
            >
              {/* Ground line */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={heroInView ? { scaleX: 1 } : {}}
                transition={{ duration: 1, delay: 0.2 }}
                className="absolute bottom-0 left-0 right-0 h-px bg-black origin-left"
              />
              
              {/* Buildings */}
              <div className="absolute bottom-0 left-0 right-0">
                {buildings.map((building, i) => (
                  <BuildingBlock key={i} {...building} />
                ))}
              </div>

              {/* Floating label */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={heroInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: 1.5 }}
                className="absolute top-10 right-0 border border-black px-4 py-2 bg-white"
              >
                <span className="text-sm font-medium">Revenue-Based Financing</span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32">
        <div ref={featuresRef} className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] max-w-3xl mb-20"
          >
            A new way for businesses to access capital.
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-16">
            {features.map((feature, index) => (
              <motion.div
                key={feature.number}
                initial={{ opacity: 0, y: 40 }}
                animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                className="group"
              >
                <div className="flex gap-6">
                  <div className="flex-shrink-0">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="w-16 h-16 border-2 border-black flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors duration-300"
                    >
                      <span className="text-lg font-bold">{feature.number}</span>
                    </motion.div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-black/60 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="h-px bg-black/10" />
      </div>

      {/* Stats Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-2 gap-8 max-w-2xl mx-auto text-center"
          >
            {[
              { value: 0, suffix: "%", label: "Equity Given Up" },
              { value: 100, suffix: "%", label: "On-Chain" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="py-8"
              >
                <div className="text-5xl md:text-6xl font-bold mb-2">
                  <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-black/50 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="h-px bg-black/10" />
      </div>

      {/* For Founders / For Investors */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24">
            {/* For Founders */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <span className="text-sm font-medium tracking-widest uppercase text-black/40 mb-4 block">For Founders</span>
              <h3 className="text-3xl md:text-4xl font-bold mb-8">Raise without dilution</h3>
              <ul className="space-y-5 text-black/70">
                {[
                  "Keep 100% of your equity",
                  "Fixed repayment tied to revenue",
                  "No board seats or control given up",
                  "Fast funding—days, not months",
                ].map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-2 h-2 bg-black flex-shrink-0" />
                    <span className="text-lg">{item}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* For Investors */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              <span className="text-sm font-medium tracking-widest uppercase text-black/40 mb-4 block">For Investors</span>
              <h3 className="text-3xl md:text-4xl font-bold mb-8">Real returns, real businesses</h3>
              <ul className="space-y-5 text-black/70">
                {[
                  "Invest in verified revenue streams",
                  "Monthly distributions from company revenue",
                  "Trade positions on secondary market",
                  "Full transparency via on-chain reporting",
                ].map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-2 h-2 bg-black flex-shrink-0" />
                    <span className="text-lg">{item}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-black text-white">
        <div ref={ctaRef} className="max-w-7xl mx-auto px-6 lg:px-8 py-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <motion.h2
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] mb-6"
            >
              Be first in line.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={ctaInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.2 }}
              className="text-xl text-white/60 max-w-xl mx-auto mb-10"
            >
              We're launching soon. Join the waitlist to get early access for your business or as an investor.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={ctaInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link
                href="/sell"
                className="px-10 py-5 bg-white text-black font-medium text-lg hover:bg-white/90 transition-all duration-300 hover:translate-y-[-2px]"
              >
                List Your Business
              </Link>
              <Link
                href="/marketplace"
                className="px-10 py-5 border-2 border-white font-medium text-lg hover:bg-white hover:text-black transition-all duration-300"
              >
                Explore Creators
              </Link>
            </motion.div>

            {/* Decorative element */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={ctaInView ? { scaleX: 1 } : {}}
              transition={{ duration: 1.5, delay: 0.6 }}
              className="mt-20 h-px bg-white/20 max-w-md mx-auto"
            />
          </motion.div>
        </div>
      </section>
    </div>
  );
}
