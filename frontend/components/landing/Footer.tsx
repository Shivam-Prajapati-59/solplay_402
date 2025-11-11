'use client';

import React from 'react';
import { Facebook, Linkedin, Twitter } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="text-gray-800 dark:text-gray-400 py-12 px-8 transition-colors">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    {/* Logo Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-purple-600 dark:bg-purple-500 rounded-lg flex items-center justify-center transition-colors">
                                <span className="text-white font-bold">SP402</span>
                            </div>
                            <span className="text-gray-800 dark:text-gray-100 font-semibold text-lg">SolPlay</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            Blockchain-powered video streaming with micropayments on Solana.
                        </p>
                    </div>

                    {/* Platform Column */}
                    <div>
                        <h3 className="text-gray-800 dark:text-gray-100 font-semibold mb-3">Platform</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <a href="/viewer" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                    Browse Videos
                                </a>
                            </li>
                            <li>
                                <a href="/viewer/dashboard" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                    Viewer Dashboard
                                </a>
                            </li>
                            <li>
                                <a href="/creator" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                    Creator Studio
                                </a>
                            </li>
                            <li>
                                <a href="/creator/upload" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                    Upload Content
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                    How It Works
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                    Pricing
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* For Creators Column */}
                    <div>
                        <h3 className="text-gray-800 dark:text-gray-100 font-semibold mb-3">For Creators</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <a href="/creator" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                    Dashboard
                                </a>
                            </li>
                            <li>
                                <a href="/creator/upload" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                    Upload Videos
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                    Analytics
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                    Earnings
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                    Creator Guide
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                    Best Practices
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Resources Column */}
                    <div>
                        <h3 className="text-gray-800 dark:text-gray-100 font-semibold mb-3">Resources</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <a href="#" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                    Documentation
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                    API Reference
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                    Blog
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                    Help Center
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                    Community
                                </a>
                            </li>
                            <li>
                                <a href="https://solana.com" target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                    About Solana
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="border-t border-gray-800 dark:border-gray-700 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    {/* Social Icons */}
                    <div className="flex gap-4">
                        <a
                            href="#"
                            className="hover:text-white dark:hover:text-gray-200 transition-colors"
                            aria-label="Facebook"
                        >
                            <Facebook size={20} />
                        </a>
                        <a
                            href="#"
                            className="hover:text-white dark:hover:text-gray-200 transition-colors"
                            aria-label="LinkedIn"
                        >
                            <Linkedin size={20} />
                        </a>
                        <a
                            href="#"
                            className="hover:text-white dark:hover:text-gray-200 transition-colors"
                            aria-label="Twitter"
                        >
                            <Twitter size={20} />
                        </a>
                    </div>

                    {/* Copyright */}
                    <div className="text-sm">
                        Copyright © 2025 Galaxea
                    </div>

                    {/* Legal Links */}
                    <div className="flex gap-4 text-sm">
                        <a href="#" className="hover:text-white dark:hover:text-gray-200 transition-colors">
                            User Agreement
                        </a>
                        <a href="#" className="hover:text-white dark:hover:text-gray-200 transition-colors">
                            Privacy Policy
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;