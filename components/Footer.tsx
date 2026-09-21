'use client';

import React from 'react';
import Link from 'next/link';
import Image from '@/components/ProxyImage';
import { motion } from 'framer-motion';

export default function Footer() {
  return (
    <motion.footer 
      className="bg-black border-t border-white/10 mt-8 sm:mt-12 md:mt-16"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
    >
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Main Footer Content */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          {/* Logo and Description */}
          <motion.div 
            className="col-span-1 md:col-span-2"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <Link href="/" className="flex items-center space-x-2 mb-3 sm:mb-4">
              <Image src="/logo.png" alt="Movime" width={32} height={32} className="sm:w-10 sm:h-10" />
              <span className="text-xl sm:text-2xl font-bold text-white tracking-wide">
                Movime
              </span>
            </Link>
            <p className="text-gray-400 text-sm sm:text-base mb-3 sm:mb-4 max-w-md">
              Your ultimate destination for movies, TV shows, anime all at one place. 
            </p>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <h3 className="text-white font-semibold text-sm sm:text-base mb-3 sm:mb-4">Quick Links</h3>
            <ul className="space-y-1.5 sm:space-y-2">
              {[
                { href: "/", label: "Home" },
                { href: "/movies", label: "Movies" },
                { href: "/tv", label: "TV Shows" },
                { href: "/anime", label: "Anime" },
                { href: "/about", label: "About" },
                { href: "/settings", label: "Settings" }
              ].map((link, index) => (
                <motion.li 
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Link href={link.href} className="text-gray-400 hover:text-white transition-colors text-sm sm:text-base">
                    {link.label}
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </motion.div>

        {/* Disclaimer */}
        <motion.div 
          className="border-t border-white/10 mt-8 pt-6"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          viewport={{ once: true }}
        >
          <div className="border-l-4 border-white/20 pl-4 py-2">
            <div className="flex items-start space-x-2">
              <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <p className="text-gray-500 text-xs leading-relaxed">
                <strong className="text-white">Disclaimer:</strong> Movime does not host or store any media files on its servers. 
                All content is sourced from third-party providers and is intended for educational and informational use only. 
                Trademarks, logos, and brand names belong to their respective owners. 
                If you believe your copyright is infringed, please contact us for prompt removal.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Copyright */}
        <motion.div 
          className="border-t border-white/10 pt-4 sm:pt-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="flex flex-col sm:flex-row justify-center items-center text-center space-y-2 sm:space-y-0 sm:space-x-1">
            <p className="text-gray-400 text-xs sm:text-sm">
              © {new Date().getFullYear()} Movime. All rights reserved.
            </p>
            <span className="hidden sm:inline text-gray-600 text-xs">•</span>
            <div className="flex items-center space-x-1">
              {[
                { href: "/privacy", label: "Privacy Policy" },
                { href: "/terms", label: "Terms of Service" },
                { href: "/contact", label: "Contact" }
              ].map((link, index) => (
                <React.Fragment key={link.href}>
                  <Link href={link.href} className="text-gray-400 hover:text-white text-xs sm:text-sm transition-colors">
                    {link.label}
                  </Link>
                  {index < 2 && <span className="text-gray-600 text-xs">•</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.footer>
  );
}
