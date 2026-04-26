'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Menu, X, Sparkles, BookOpen, HelpCircle, FileText } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { AnimatedBorderButton } from '@/components/ui/animated-border-button';
import { AnimatedGetStartedButton } from '@/components/ui/animated-get-started-button';

const navVariants = {
    hidden: { y: -100, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            duration: 0.5,
            ease: [0.25, 0.1, 0.25, 1],
        },
    },
};

const logoVariants = {
    rest: { scale: 1, rotate: 0 },
    hover: {
        scale: 1.1,
        rotate: [0, -5, 5, -5, 0],
        transition: {
            duration: 0.5,
            ease: "easeInOut",
        },
    },
};

const menuItemVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            delay: i * 0.1,
            duration: 0.3,
            ease: "easeOut",
        },
    }),
};

const mobileMenuItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
        opacity: 1,
        x: 0,
        transition: {
            delay: i * 0.05,
            duration: 0.3,
            ease: "easeOut",
        },
    }),
    exit: {
        opacity: 0,
        x: -20,
        transition: {
            duration: 0.2,
        },
    },
};

export function PublicNavbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
    const [scrolled, setScrolled] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);
    const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
    const { scrollY } = useScroll();
    const backgroundColor = useTransform(
        scrollY,
        [0, 50],
        ['rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.95)']
    );

    React.useEffect(() => {
        setMounted(true);
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <motion.header
            className="sticky top-0 z-50 flex flex-col"
            initial="hidden"
            animate="visible"
            variants={navVariants}
        >
            <motion.nav
                className={cn(
                    "backdrop-blur-md border-b border-transparent transition-all duration-300",
                    scrolled ? "border-slate-200 shadow-sm" : ""
                )}
                style={{ backgroundColor }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        {/* Logo */}
                        <motion.div
                            variants={logoVariants}
                            initial="rest"
                            whileHover="hover"
                            whileTap={{ scale: 0.95 }}
                        >
                            <Link href="/" className="flex items-center space-x-2 group">
                                <motion.div
                                    className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 relative overflow-hidden"
                                    whileHover={{
                                        boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.4)",
                                    }}
                                >
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-blue-600/20"
                                        animate={{
                                            scale: [1, 1.2, 1],
                                            opacity: [0.5, 0.8, 0.5],
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            ease: "easeInOut",
                                        }}
                                    />
                                    <motion.span
                                        className="text-white font-bold text-lg relative z-10"
                                        animate={{
                                            scale: [1, 1.05, 1],
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            ease: "easeInOut",
                                        }}
                                    >
                                        T
                                    </motion.span>
                                </motion.div>
                                <motion.span
                                    className="text-xl font-bold text-slate-900 tracking-tight"
                                    whileHover={{
                                        color: "rgb(37, 99, 235)",
                                        textShadow: "0 0 15px rgba(37, 99, 235, 0.3)"
                                    }}
                                    transition={{ duration: 0.2 }}
                                >
                                    TalentSync
                                </motion.span>
                            </Link>
                        </motion.div>

                        {/* Desktop Navigation */}
                        <motion.div
                            className="hidden md:flex items-center space-x-1"
                            initial="hidden"
                            animate="visible"
                            variants={{
                                visible: {
                                    transition: {
                                        staggerChildren: 0.1,
                                    },
                                },
                            }}
                        >
                            <NavigationMenu>
                                <NavigationMenuList>
                                    <NavigationMenuItem className="flex items-center justify-center relative">
                                        <div
                                            className="relative flex items-center justify-center"
                                            onMouseEnter={() => setHoveredIndex(0)}
                                            onMouseLeave={() => setHoveredIndex(null)}
                                        >
                                            <NavigationMenuTrigger className="text-base font-medium transition-all duration-300 text-slate-600 hover:text-blue-600 bg-transparent group px-4">
                                                Product
                                            </NavigationMenuTrigger>

                                            <AnimatePresence>
                                                {mounted && hoveredIndex === 0 && (
                                                    <motion.div
                                                        layoutId="nav-glow"
                                                        className="absolute -bottom-[2px] left-0 right-0 flex justify-center pointer-events-none z-50"
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                    >
                                                        {/* Lamp Glow Source - Offset to the left side */}
                                                        <div className="relative flex flex-col items-center w-full transform -translate-x-[12px]">
                                                            {/* The "Filament" - Bright core line */}
                                                            <div className="w-20 h-[2px] bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.9)]" />

                                                            {/* Light Cone radiating downward */}
                                                            <div
                                                                className="absolute top-0 w-32 h-20"
                                                                style={{
                                                                    background: 'radial-gradient(ellipse 50% 100% at 50% 0%, rgba(59, 130, 246, 0.45) 0%, transparent 75%)',
                                                                    filter: 'blur(8px)',
                                                                    transform: 'translateY(1px)'
                                                                }}
                                                            />
                                                            <div
                                                                className="absolute top-0 w-48 h-32"
                                                                style={{
                                                                    background: 'radial-gradient(ellipse 50% 100% at 50% 0%, rgba(96, 165, 250, 0.15) 0%, transparent 80%)',
                                                                    filter: 'blur(16px)',
                                                                    transform: 'translateY(2px)'
                                                                }}
                                                            />
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                        <NavigationMenuContent>
                                            <motion.ul
                                                className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]"
                                                initial="hidden"
                                                animate="visible"
                                                variants={{
                                                    visible: {
                                                        transition: {
                                                            staggerChildren: 0.05,
                                                        },
                                                    },
                                                }}
                                            >
                                                <motion.li
                                                    className="row-span-3"
                                                    variants={{
                                                        hidden: { opacity: 0, scale: 0.95 },
                                                        visible: {
                                                            opacity: 1,
                                                            scale: 1,
                                                            transition: { duration: 0.3 },
                                                        },
                                                    }}
                                                >
                                                    <NavigationMenuLink asChild>
                                                        <motion.a
                                                            className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-blue-50/50 to-blue-100/50 p-6 no-underline outline-none focus:shadow-md transition-all hover:bg-blue-50 relative overflow-hidden group"
                                                            href="#features"
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                        >
                                                            <motion.div
                                                                className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/10 to-blue-400/0"
                                                                initial={{ x: '-100%' }}
                                                                whileHover={{ x: '100%' }}
                                                                transition={{ duration: 0.6 }}
                                                            />
                                                            <motion.div
                                                                className="h-10 w-10 bg-white rounded-lg flex items-center justify-center mb-4 shadow-sm text-primary relative z-10"
                                                                whileHover={{ rotate: 360 }}
                                                                transition={{ duration: 0.6 }}
                                                            >
                                                                <Sparkles className="h-5 w-5" />
                                                            </motion.div>
                                                            <div className="mb-2 mt-4 text-lg font-medium text-slate-900 relative z-10">
                                                                The Full Suite
                                                            </div>
                                                            <p className="text-sm leading-tight text-slate-600 relative z-10">
                                                                Everything you need to source, screen, and hire the best talent 10x faster.
                                                            </p>
                                                        </motion.a>
                                                    </NavigationMenuLink>
                                                </motion.li>
                                                <ListItem href="#scheduling" title="Smart Scheduling" index={1}>
                                                    Eliminate email ping-pong with automated calendar sync.
                                                </ListItem>
                                                <ListItem href="#candidates" title="Candidate Database" index={2}>
                                                    Unified view of all your candidates and their history.
                                                </ListItem>
                                                <ListItem href="#analytics" title="Analytics" index={3}>
                                                    Data-driven insights into your hiring funnel.
                                                </ListItem>
                                            </motion.ul>
                                        </NavigationMenuContent>
                                    </NavigationMenuItem>

                                    <NavigationMenuItem className="flex items-center justify-center relative">
                                        <div
                                            className="relative flex items-center justify-center"
                                            onMouseEnter={() => setHoveredIndex(1)}
                                            onMouseLeave={() => setHoveredIndex(null)}
                                        >
                                            <NavigationMenuTrigger className="text-base font-medium transition-all duration-300 text-slate-600 hover:text-blue-600 bg-transparent group px-4">
                                                Resources
                                            </NavigationMenuTrigger>

                                            <AnimatePresence>
                                                {mounted && hoveredIndex === 1 && (
                                                    <motion.div
                                                        layoutId="nav-glow"
                                                        className="absolute -bottom-[2px] left-0 right-0 flex justify-center pointer-events-none z-50"
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                    >
                                                        {/* Lamp Glow Source - Offset to the left side */}
                                                        <div className="relative flex flex-col items-center w-full transform -translate-x-[12px]">
                                                            {/* The "Filament" - Bright core line */}
                                                            <div className="w-20 h-[2px] bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.9)]" />

                                                            {/* Light Cone radiating downward */}
                                                            <div
                                                                className="absolute top-0 w-32 h-20"
                                                                style={{
                                                                    background: 'radial-gradient(ellipse 50% 100% at 50% 0%, rgba(59, 130, 246, 0.45) 0%, transparent 75%)',
                                                                    filter: 'blur(8px)',
                                                                    transform: 'translateY(1px)'
                                                                }}
                                                            />
                                                            <div
                                                                className="absolute top-0 w-48 h-32"
                                                                style={{
                                                                    background: 'radial-gradient(ellipse 50% 100% at 50% 0%, rgba(96, 165, 250, 0.15) 0%, transparent 80%)',
                                                                    filter: 'blur(16px)',
                                                                    transform: 'translateY(2px)'
                                                                }}
                                                            />
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                        <NavigationMenuContent>
                                            <motion.ul
                                                className="grid gap-3 p-4 w-[400px]"
                                                initial="hidden"
                                                animate="visible"
                                                variants={{
                                                    visible: {
                                                        transition: {
                                                            staggerChildren: 0.05,
                                                        },
                                                    },
                                                }}
                                            >
                                                <ListItem href="#" title="Documentation" index={0}>
                                                    <motion.div
                                                        className="flex items-center gap-2"
                                                        whileHover={{ x: 4 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        <motion.div
                                                            whileHover={{ rotate: 15 }}
                                                            transition={{ duration: 0.2 }}
                                                        >
                                                            <BookOpen className="w-4 h-4 text-slate-400" />
                                                        </motion.div>
                                                        <span>Guides & API Reference</span>
                                                    </motion.div>
                                                </ListItem>
                                                <ListItem href="#" title="Blog" index={1}>
                                                    <motion.div
                                                        className="flex items-center gap-2"
                                                        whileHover={{ x: 4 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        <motion.div
                                                            whileHover={{ rotate: 15 }}
                                                            transition={{ duration: 0.2 }}
                                                        >
                                                            <FileText className="w-4 h-4 text-slate-400" />
                                                        </motion.div>
                                                        <span>Latest updates & hiring tips</span>
                                                    </motion.div>
                                                </ListItem>
                                                <ListItem href="#" title="Help Center" index={2}>
                                                    <motion.div
                                                        className="flex items-center gap-2"
                                                        whileHover={{ x: 4 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        <motion.div
                                                            whileHover={{ rotate: 15 }}
                                                            transition={{ duration: 0.2 }}
                                                        >
                                                            <HelpCircle className="w-4 h-4 text-slate-400" />
                                                        </motion.div>
                                                        <span>Support & community</span>
                                                    </motion.div>
                                                </ListItem>
                                            </motion.ul>
                                        </NavigationMenuContent>
                                    </NavigationMenuItem>

                                    <NavigationMenuItem className="flex items-center justify-center relative">
                                        <div
                                            className="relative flex items-center justify-center"
                                            onMouseEnter={() => setHoveredIndex(2)}
                                            onMouseLeave={() => setHoveredIndex(null)}
                                        >
                                            <NavigationMenuLink asChild className={cn(navigationMenuTriggerStyle(), "text-base font-medium text-slate-600 hover:text-blue-600 bg-transparent transition-colors duration-300 px-4")}>
                                                <motion.div whileTap={{ scale: 0.95 }}>
                                                    <Link href="#pricing">
                                                        Pricing
                                                    </Link>
                                                </motion.div>
                                            </NavigationMenuLink>

                                            <AnimatePresence>
                                                {mounted && hoveredIndex === 2 && (
                                                    <motion.div
                                                        layoutId="nav-glow"
                                                        className="absolute -bottom-[2px] left-0 right-0 flex justify-center pointer-events-none z-50"
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                    >
                                                        {/* Lamp Glow Source - Offset to the left side */}
                                                        <div className="relative flex flex-col items-center w-full transform -translate-x-[12px]">
                                                            {/* The "Filament" - Bright core line */}
                                                            <div className="w-20 h-[2px] bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.9)]" />

                                                            {/* Light Cone radiating downward */}
                                                            <div
                                                                className="absolute top-0 w-32 h-20"
                                                                style={{
                                                                    background: 'radial-gradient(ellipse 50% 100% at 50% 0%, rgba(59, 130, 246, 0.45) 0%, transparent 75%)',
                                                                    filter: 'blur(8px)',
                                                                    transform: 'translateY(1px)'
                                                                }}
                                                            />
                                                            <div
                                                                className="absolute top-0 w-48 h-32"
                                                                style={{
                                                                    background: 'radial-gradient(ellipse 50% 100% at 50% 0%, rgba(96, 165, 250, 0.15) 0%, transparent 80%)',
                                                                    filter: 'blur(16px)',
                                                                    transform: 'translateY(2px)'
                                                                }}
                                                            />
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </NavigationMenuItem>
                                </NavigationMenuList>
                            </NavigationMenu>
                        </motion.div>

                        {/* CTA Buttons */}
                        <motion.div
                            className="hidden md:flex items-center space-x-4"
                            initial="hidden"
                            animate="visible"
                            variants={{
                                visible: {
                                    transition: {
                                        staggerChildren: 0.1,
                                    },
                                },
                            }}
                        >
                            <motion.div variants={menuItemVariants} custom={3}>
                                <Link href="/login">
                                    <AnimatedBorderButton text="Login" />
                                </Link>
                            </motion.div>
                            <motion.div variants={menuItemVariants} custom={4}>
                                <Link href="/signup">
                                    <AnimatedGetStartedButton text="Get Started" />
                                </Link>
                            </motion.div>
                        </motion.div>

                        {/* Mobile Menu Button */}
                        <motion.button
                            className="md:hidden p-2 text-slate-600 hover:text-slate-900 relative"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label="Toggle menu"
                            whileTap={{ scale: 0.9 }}
                        >
                            <AnimatePresence mode="wait">
                                {mobileMenuOpen ? (
                                    <motion.div
                                        key="close"
                                        initial={{ rotate: -90, opacity: 0 }}
                                        animate={{ rotate: 0, opacity: 1 }}
                                        exit={{ rotate: 90, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <X className="h-6 w-6" />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="menu"
                                        initial={{ rotate: 90, opacity: 0 }}
                                        animate={{ rotate: 0, opacity: 1 }}
                                        exit={{ rotate: -90, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <Menu className="h-6 w-6" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.button>
                    </div>
                </div>

                {/* Mobile Menu */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="md:hidden bg-white border-t border-slate-200 overflow-hidden"
                        >
                            <motion.div
                                className="px-4 py-6 space-y-4"
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                variants={{
                                    visible: {
                                        transition: {
                                            staggerChildren: 0.05,
                                            delayChildren: 0.1,
                                        },
                                    },
                                    exit: {
                                        transition: {
                                            staggerChildren: 0.03,
                                            staggerDirection: -1,
                                        },
                                    },
                                }}
                            >
                                <motion.div className="space-y-3" variants={mobileMenuItemVariants} custom={0}>
                                    <motion.div
                                        className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2"
                                        variants={mobileMenuItemVariants}
                                        custom={0}
                                    >
                                        Product
                                    </motion.div>
                                    <motion.div variants={mobileMenuItemVariants} custom={1}>
                                        <Link
                                            href="#features"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="block px-2 py-2 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-50 transition-colors"
                                        >
                                            Features
                                        </Link>
                                    </motion.div>
                                    <motion.div variants={mobileMenuItemVariants} custom={2}>
                                        <Link
                                            href="#scheduling"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="block px-2 py-2 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-50 transition-colors"
                                        >
                                            Scheduling
                                        </Link>
                                    </motion.div>
                                    <motion.div variants={mobileMenuItemVariants} custom={3}>
                                        <Link
                                            href="#analytics"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="block px-2 py-2 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-50 transition-colors"
                                        >
                                            Analytics
                                        </Link>
                                    </motion.div>
                                </motion.div>
                                <motion.div className="space-y-3" variants={mobileMenuItemVariants} custom={4}>
                                    <motion.div
                                        className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2"
                                        variants={mobileMenuItemVariants}
                                        custom={4}
                                    >
                                        Resources
                                    </motion.div>
                                    <motion.div variants={mobileMenuItemVariants} custom={5}>
                                        <Link
                                            href="#"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="block px-2 py-2 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-50 transition-colors"
                                        >
                                            Documentation
                                        </Link>
                                    </motion.div>
                                    <motion.div variants={mobileMenuItemVariants} custom={6}>
                                        <Link
                                            href="#"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="block px-2 py-2 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-50 transition-colors"
                                        >
                                            Blog
                                        </Link>
                                    </motion.div>
                                </motion.div>
                                <motion.div variants={mobileMenuItemVariants} custom={7}>
                                    <Link
                                        href="#pricing"
                                        className="block text-base font-medium text-slate-600 hover:text-slate-900 px-2 py-2 rounded-md hover:bg-slate-50 transition-colors"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        Pricing
                                    </Link>
                                </motion.div>
                                <motion.div
                                    className="pt-4 border-t border-slate-100 grid gap-3"
                                    variants={mobileMenuItemVariants}
                                    custom={8}
                                >
                                    <motion.div
                                        variants={mobileMenuItemVariants}
                                        custom={8}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="w-full">
                                            <Button variant="outline" className="w-full justify-center">
                                                Login
                                            </Button>
                                        </Link>
                                    </motion.div>
                                    <motion.div
                                        variants={mobileMenuItemVariants}
                                        custom={9}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="w-full">
                                            <Button className="w-full justify-center bg-primary hover:bg-primary/90">
                                                Get Started
                                            </Button>
                                        </Link>
                                    </motion.div>
                                </motion.div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.nav>
        </motion.header>
    );
}

interface ListItemProps extends React.ComponentPropsWithoutRef<"a"> {
    title: string;
    index?: number;
}

const ListItem = React.forwardRef<React.ElementRef<"a">, ListItemProps>(
    ({ className, title, children, index = 0, href, ...props }, ref) => {
        return (
            <motion.li
                variants={{
                    hidden: { opacity: 0, y: 10 },
                    visible: {
                        opacity: 1,
                        y: 0,
                        transition: {
                            delay: index * 0.05,
                            duration: 0.3,
                            ease: "easeOut",
                        },
                    },
                }}
            >
                <NavigationMenuLink asChild>
                    <motion.a
                        ref={ref}
                        href={href}
                        className={cn(
                            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-slate-50 focus:bg-slate-50 group relative overflow-hidden",
                            className
                        )}
                        whileHover={{ scale: 1.02, x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        {...(props as any)}
                    >
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-blue-50/0 via-blue-50/50 to-blue-50/0"
                            initial={{ x: '-100%' }}
                            whileHover={{ x: '100%' }}
                            transition={{ duration: 0.5 }}
                        />
                        <motion.div
                            className="text-sm font-medium leading-none text-slate-900 group-hover:text-primary transition-colors relative z-10"
                            whileHover={{ x: 2 }}
                        >
                            {title}
                        </motion.div>
                        <motion.div
                            className="line-clamp-2 text-sm leading-snug text-slate-500 mt-1 relative z-10"
                            initial={{ opacity: 0.7 }}
                            whileHover={{ opacity: 1 }}
                        >
                            {children}
                        </motion.div>
                    </motion.a>
                </NavigationMenuLink>
            </motion.li>
        );
    }
);
ListItem.displayName = "ListItem";
