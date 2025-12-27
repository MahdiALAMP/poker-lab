'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

const navItems = [
    { href: '/', label: 'Home' },
    { href: '/upload', label: 'Import' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/hands', label: 'Hands' },
    { href: '/trainer', label: 'Trainer' },
]

export function Navbar() {
    const pathname = usePathname()

    return (
        <nav className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-slate-800">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/25">
                            <span className="text-white font-bold text-lg">♠</span>
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                            Poker Lab
                        </span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="flex items-center gap-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href ||
                                (item.href !== '/' && pathname.startsWith(item.href))

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={clsx(
                                        'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                                        isActive
                                            ? 'text-white bg-indigo-600/20 border border-indigo-500/30'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                                    )}
                                >
                                    {item.label}
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </div>
        </nav>
    )
}
