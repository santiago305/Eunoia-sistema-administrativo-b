import { Injectable } from '@nestjs/common';

@Injectable()
export class MessageContentService {
  sanitizeHtmlBody(bodyHtml: string) {
    let sanitized = String(bodyHtml ?? '');
    sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, '');
    sanitized = sanitized.replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select|svg|math)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
    sanitized = sanitized.replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select|svg|math)[^>]*\/?\s*>/gi, '');
    sanitized = sanitized.replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, '');
    sanitized = sanitized.replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, '');
    sanitized = sanitized.replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, '');
    sanitized = sanitized.replace(/\s(href|src)\s*=\s*"\s*javascript:[^"]*"/gi, ' $1="#"');
    sanitized = sanitized.replace(/\s(href|src)\s*=\s*'\s*javascript:[^']*'/gi, " $1='#'");
    sanitized = sanitized.replace(/\s(href|src)\s*=\s*(javascript:[^\s>]+)/gi, ' $1="#"');
    sanitized = sanitized.replace(/\sstyle\s*=\s*"[^"]*(expression|javascript:|url\s*\(\s*javascript:)[^"]*"/gi, '');
    sanitized = sanitized.replace(/\sstyle\s*=\s*'[^']*(expression|javascript:|url\s*\(\s*javascript:)[^']*'/gi, '');
    sanitized = sanitized.replace(/<a\b([^>]*)>/gi, (_m, attrs: string) => {
      const hasTargetBlank = /\btarget\s*=\s*(['"])_blank\1/i.test(attrs);
      if (!hasTargetBlank) return `<a${attrs}>`;
      if (/\brel\s*=/i.test(attrs)) return `<a${attrs}>`;
      return `<a${attrs} rel="noopener noreferrer">`;
    });
    return sanitized.trim();
  }

  normalizeHtmlBody(bodyHtml: string) {
    return this.sanitizeHtmlBody(bodyHtml);
  }

  toBodyText(bodyHtml: string) {
    return this.normalizeHtmlBody(bodyHtml).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
