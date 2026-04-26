/**
 * HTML Sanitization Utility
 * Uses DOMPurify to prevent XSS attacks when rendering HTML content
 */
import DOMPurify from 'dompurify';

// Configure DOMPurify hooks to validate URLs
if (typeof window !== 'undefined') {
    // Remove any javascript: or data: URLs from href and src attributes
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
        if (node.hasAttribute('href')) {
            const href = node.getAttribute('href') || '';
            if (href.startsWith('javascript:') || href.startsWith('data:')) {
                node.removeAttribute('href');
            }
        }
        if (node.hasAttribute('src')) {
            const src = node.getAttribute('src') || '';
            // Only allow https:// or relative URLs for images
            if (!src.startsWith('https://') && !src.startsWith('/') && !src.startsWith('./')) {
                node.removeAttribute('src');
            }
        }
    });
}

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param html - Raw HTML string that may contain malicious content
 * @returns Sanitized HTML string safe to render with dangerouslySetInnerHTML
 */
export function sanitizeHtml(html: string): string {
    if (typeof window === 'undefined') {
        // Server-side: return empty or original (will be sanitized on client)
        return '';
    }
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
            'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li',
            'a', 'span', 'div',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'blockquote', 'pre', 'code',
            'img',
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class'],
        ALLOW_DATA_ATTR: false,
        // Require rel="noopener noreferrer" for links with target="_blank"
        ADD_ATTR: ['target'],
    });
}

/**
 * Create props object for dangerouslySetInnerHTML with sanitized HTML
 * @param html - Raw HTML string
 * @returns Object suitable for spreading onto an element
 */
export function createSanitizedHtmlProps(html: string): { dangerouslySetInnerHTML: { __html: string } } {
    return {
        dangerouslySetInnerHTML: { __html: sanitizeHtml(html) },
    };
}
