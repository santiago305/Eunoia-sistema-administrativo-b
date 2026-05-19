import { MessageContentService } from './message-content.service';

describe('MessageContentService', () => {
  const service = new MessageContentService();

  it('removes script tags and keeps safe formatting tags', () => {
    const html = '<p>Hola <strong>mundo</strong><script>alert(1)</script></p>';
    const sanitized = service.normalizeHtmlBody(html);

    expect(sanitized).toContain('<p>');
    expect(sanitized).toContain('<strong>');
    expect(sanitized).not.toContain('<script');
  });

  it('blocks dangerous links even when protocol is encoded as entity', () => {
    const html = '<a href="&#x6a;avascript:alert(1)">click</a>';
    const sanitized = service.normalizeHtmlBody(html);

    expect(sanitized).toContain('>click</a>');
    expect(sanitized).not.toMatch(/href\s*=/i);
  });

  it('blocks data protocol links', () => {
    const html = '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">click</a>';
    const sanitized = service.normalizeHtmlBody(html);

    expect(sanitized).not.toMatch(/href\s*=/i);
  });

  it('adds noopener noreferrer when link opens on new tab', () => {
    const html = '<a href="https://example.com" target="_blank">go</a>';
    const sanitized = service.normalizeHtmlBody(html);

    expect(sanitized).toContain('target="_blank"');
    expect(sanitized).toContain('rel="noopener noreferrer"');
  });

  it('converts sanitized html into body text', () => {
    const html = '<p>Hola</p><p><strong>equipo</strong></p>';
    const text = service.toBodyText(html);

    expect(text).toBe('Hola equipo');
  });
});
