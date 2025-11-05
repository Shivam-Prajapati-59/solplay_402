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
                                <span className="text-gray-800 font-bold">G</span>
                            </div>
                            <span className="text-gray-800 dark:text-gray-100 font-semibold text-lg">Galaxea</span>
                        </div>
                    </div>

                    {/* Marketplace Column */}
                    <div>
                        <h3 className="text-gray-800 dark:text-gray-100 font-semibold mb-3">Marketplace</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <a href="#" className="hover:text-white dark:hover:text-gray-200 transition-colors">
                                    Art
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-white dark:hover:text-gray-200 transition-colors">
                                    Gaming
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-white dark:hover:text-gray-200 transition-colors">
                                    Memberships
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-white dark:hover:text-gray-200 transition-colors">
                                    PFPs
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-white dark:hover:text-gray-200 transition-colors">
                                    Photography
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-white dark:hover:text-gray-200 transition-colors">
                                    Music
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* My Account Column */}
                    <div>
                        <h3 className="text-white dark:text-gray-100 font-semibold mb-3">My Account</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <a href="#" className="hover:text-white dark:hover:text-gray-200 transition-colors">
                                    Profile
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-white dark:hover:text-gray-200 transition-colors">
                                    Favorites
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-white dark:hover:text-gray-200 transition-colors">
                                    Watchlist
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-white dark:hover:text-gray-200 transition-colors">
                                    Studio
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-white dark:hover:text-gray-200 transition-colors">
                                    Goodies Pro
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-white dark:hover:text-gray-200 transition-colors">
                                    Settings
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Resources Column */}
                    <div>
                        <h3 className="text-white dark:text-gray-100 font-semibold mb-3">Resources</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <a href="#" className="hover:text-white dark:hover:text-gray-200 transition-colors">
                                    Blog
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-white dark:hover:text-gray-200 transition-colors">
                                    Learn
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-white dark:hover:text-gray-200 transition-colors">
                                    News
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-white dark:hover:text-gray-200 transition-colors">
                                    Help Center
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-white dark:hover:text-gray-200 transition-colors">
                                    Docs
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