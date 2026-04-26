/**
 * Portal Link Configuration
 *
 * These settings control automated portal link sending behavior.
 * TODO: In the future, these should be tenant-configurable via settings.
 */

/**
 * Stages that trigger automatic portal link sending.
 * When a candidate transitions TO one of these stages, a portal link will be sent.
 */
export const PORTAL_AUTO_SEND_STAGES = ['APPLIED', 'SCREENING'];

/**
 * Portal token expiry in days
 */
export const PORTAL_TOKEN_EXPIRY_DAYS = 7;

/**
 * Default channel for auto-send messages
 */
export const PORTAL_AUTO_SEND_DEFAULT_CHANNEL = 'EMAIL';

/**
 * Whether auto-send is enabled globally
 * TODO: Make tenant-configurable
 */
export const PORTAL_AUTO_SEND_ENABLED = true;
