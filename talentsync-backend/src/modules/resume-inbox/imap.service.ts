import { Injectable, Logger } from '@nestjs/common';
import { ImapFlow, FetchMessageObject } from 'imapflow';
import { simpleParser, ParsedMail, Attachment } from 'mailparser';

export interface ImapConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean;
}

export interface FetchedEmail {
  messageId: string;
  uid: number;
  fromAddress: string;
  fromName: string | undefined;
  subject: string;
  bodyPreview: string;
  receivedAt: Date;
  attachments: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  content: Buffer;
}

@Injectable()
export class ImapService {
  private readonly logger = new Logger(ImapService.name);

  /**
   * Test connection to IMAP server
   */
  async testConnection(
    config: ImapConfig,
  ): Promise<{ success: boolean; message: string }> {
    let client: ImapFlow | null = null;

    try {
      client = new ImapFlow({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.password,
        },
        logger: false,
      });

      await client.connect();
      const mailboxes = await client.list();
      await client.logout();

      return {
        success: true,
        message: `Connected successfully. Found ${mailboxes.length} mailboxes.`,
      };
    } catch (error) {
      this.logger.error(`IMAP connection test failed: ${error.message}`);
      return {
        success: false,
        message: error.message || 'Connection failed',
      };
    } finally {
      if (client) {
        try {
          await client.logout();
        } catch {
          // Ignore logout errors
        }
      }
    }
  }

  /**
   * Fetch new emails from INBOX since a given date
   */
  async fetchNewEmails(
    config: ImapConfig,
    sinceDate?: Date,
    excludeMessageIds?: Set<string>,
  ): Promise<FetchedEmail[]> {
    let client: ImapFlow | null = null;
    const emails: FetchedEmail[] = [];

    try {
      client = new ImapFlow({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.password,
        },
        logger: false,
      });

      await client.connect();
      const lock = await client.getMailboxLock('INBOX');

      try {
        // Build search criteria
        const searchCriteria: any = sinceDate
          ? { since: sinceDate }
          : { all: true };

        // Search for messages
        const searchResult = await client.search(searchCriteria, { uid: true });

        // Handle case where search returns false (no messages)
        if (
          !searchResult ||
          (Array.isArray(searchResult) && searchResult.length === 0)
        ) {
          this.logger.log('No new messages found');
          return [];
        }

        const messages = searchResult;
        this.logger.log(`Found ${messages.length} messages to process`);

        // Fetch full messages
        for await (const message of client.fetch(messages, {
          envelope: true,
          source: true,
          uid: true,
        })) {
          try {
            const email = await this.parseMessage(message, excludeMessageIds);
            if (email) {
              emails.push(email);
            }
          } catch (parseError) {
            this.logger.error(
              `Failed to parse message UID ${message.uid}: ${parseError.message}`,
            );
          }
        }
      } finally {
        lock.release();
      }

      await client.logout();
    } catch (error) {
      this.logger.error(`IMAP fetch failed: ${error.message}`);
      throw error;
    } finally {
      if (client) {
        try {
          await client.logout();
        } catch {
          // Ignore logout errors
        }
      }
    }

    return emails;
  }

  /**
   * Parse a single IMAP message into our format
   */
  private async parseMessage(
    message: FetchMessageObject,
    excludeMessageIds?: Set<string>,
  ): Promise<FetchedEmail | null> {
    if (!message.source) {
      return null;
    }

    const parsed: ParsedMail = await simpleParser(message.source);

    // Skip if we've already processed this message
    const messageId = parsed.messageId || `uid-${message.uid}`;
    if (excludeMessageIds?.has(messageId)) {
      return null;
    }

    // Extract from address
    const fromAddress = parsed.from?.value?.[0]?.address || '';
    const fromName = parsed.from?.value?.[0]?.name;

    // Get body preview (first 500 chars of text)
    const bodyText = parsed.text || '';
    const bodyPreview = bodyText.substring(0, 500);

    // Extract attachments (only resume-like files)
    const attachments: EmailAttachment[] = [];
    const resumeExtensions = ['.pdf', '.doc', '.docx', '.rtf', '.txt'];
    const resumeMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/rtf',
      'text/plain',
    ];

    for (const att of parsed.attachments || []) {
      const filename = att.filename || 'attachment';
      const extension = filename
        .toLowerCase()
        .substring(filename.lastIndexOf('.'));

      // Check if it's a resume-like file
      if (
        resumeExtensions.includes(extension) ||
        resumeMimeTypes.includes(att.contentType)
      ) {
        attachments.push({
          filename: att.filename || 'resume',
          contentType: att.contentType,
          size: att.size,
          content: att.content,
        });
      }
    }

    return {
      messageId,
      uid: message.uid,
      fromAddress,
      fromName,
      subject: parsed.subject || '(No Subject)',
      bodyPreview,
      receivedAt: parsed.date || new Date(),
      attachments,
    };
  }

  /**
   * Mark message as read on the server
   */
  async markAsRead(config: ImapConfig, uid: number): Promise<void> {
    let client: ImapFlow | null = null;

    try {
      client = new ImapFlow({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.password,
        },
        logger: false,
      });

      await client.connect();
      const lock = await client.getMailboxLock('INBOX');

      try {
        await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
      } finally {
        lock.release();
      }

      await client.logout();
    } catch (error) {
      this.logger.error(`Failed to mark message as read: ${error.message}`);
      throw error;
    } finally {
      if (client) {
        try {
          await client.logout();
        } catch {
          // Ignore
        }
      }
    }
  }
}
