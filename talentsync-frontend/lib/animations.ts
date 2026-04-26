/**
 * Reusable Animation Variants for Framer Motion
 * Use these consistent animations across the app for a polished UX
 */

// Fade in from bottom (for cards, sections)
export const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
};

// Fade in from left (for sidebars, panels)
export const fadeInLeft = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
};

// Fade in from right (for detail panels)
export const fadeInRight = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
};

// Simple fade (for overlays, modals)
export const fadeIn = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
};

// Scale up (for modals, popups)
export const scaleIn = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
};

// Stagger container (wrap children that should animate sequentially)
export const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.1,
        },
    },
};

// Stagger item (use with staggerContainer)
export const staggerItem = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
};

// Page transition
export const pageTransition = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
};

// Spring transition config for natural feel
export const springTransition = {
    type: 'spring',
    stiffness: 300,
    damping: 30,
};

// Smooth transition config
export const smoothTransition = {
    duration: 0.3,
    ease: [0.4, 0, 0.2, 1],
};

// Delayed stagger for lists
export const getStaggerDelay = (index: number, baseDelay = 0.05) => ({
    delay: index * baseDelay,
});

// Hover scale effect
export const hoverScale = {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: { duration: 0.2 },
};

// Card hover effect
export const cardHover = {
    whileHover: {
        y: -4,
        boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)',
    },
    transition: { duration: 0.2 },
};
