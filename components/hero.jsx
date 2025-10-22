"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const HeroSection = () => {
  return (
    <section className="w-full pt-36 md:pt-48 pb-10">
      <div className="space-y-6 text-center">
        <div className="space-y-6 mx-auto">
          <h1 className="gradient-title text-5xl md:text-6xl lg:text-7xl xl:text-8xl animate-gradient">
            FUTURION
            <br />
            Crafting visions Of Future
          </h1>
          <p className="mx-auto max-w-[600px] text-muted-foreground md:text-3xl">
            Your AI Career Coach for Professional Success
          </p>
        </div>
        <div className="flex justify-center space-x-4">
          <Link href="/dashboard">
            <Button size="lg" className="px-8">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
