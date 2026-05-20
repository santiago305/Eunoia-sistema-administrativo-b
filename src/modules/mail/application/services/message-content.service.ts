import { Injectable } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';

const MAIL_ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'blockquote',
  'pre',
  'code',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'a',
  'span',
  'div',
  'img',
  'hr',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
] as const;

const MAIL_ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  a: ['href', 'name', 'target', 'rel', 'class'],
  img: ['src', 'alt', 'title', 'width', 'height', 'class'],
  p: ['style', 'class'],
  span: ['style', 'class'],
  div: ['style', 'class'],
  h1: ['style', 'class'],
  h2: ['style', 'class'],
  h3: ['style', 'class'],
  h4: ['style', 'class'],
  h5: ['style', 'class'],
  h6: ['style', 'class'],
  li: ['style', 'class'],
  table: ['class'],
  thead: ['class'],
  tbody: ['class'],
  tr: ['class'],
  th: ['class', 'colspan', 'rowspan', 'style'],
  td: ['class', 'colspan', 'rowspan', 'style'],
};

const MAIL_ALLOWED_STYLES: sanitizeHtml.IOptions['allowedStyles'] = {
  '*': {
    color: [/^#[0-9a-f]{3,8}$/i, /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i],
    'background-color': [/^#[0-9a-f]{3,8}$/i, /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i],
    'font-size': [/^\d+(?:px|rem|em|%)$/i],
    'text-align': [/^(left|right|center|justify)$/i],
  },
};

@Injectable()
export class MessageContentService {
  sanitizeHtmlBody(bodyHtml: string) {
    const sanitized = sanitizeHtml(String(bodyHtml ?? ''), {
      allowedTags: [...MAIL_ALLOWED_TAGS],
      allowedAttributes: MAIL_ALLOWED_ATTRIBUTES,
      allowedStyles: MAIL_ALLOWED_STYLES,
      allowProtocolRelative: false,
      allowedSchemes: ['http', 'https', 'mailto'],
      allowedSchemesByTag: {
        img: ['http', 'https'],
      },
      transformTags: {
        a: (tagName, attribs) => {
          const normalized = { ...attribs };
          if (String(normalized.target ?? '').toLowerCase() === '_blank') {
            normalized.rel = 'noopener noreferrer';
          }
          return {
            tagName,
            attribs: normalized,
          };
        },
      },
    });
    return sanitized.replace(/<img\b(?![^>]*\bsrc=)[^>]*\/?>/gi, '').trim();
  }

  normalizeHtmlBody(bodyHtml: string) {
    return this.sanitizeHtmlBody(bodyHtml);
  }

  toBodyText(bodyHtml: string) {
    return this.normalizeHtmlBody(bodyHtml).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
