import sanitizeHtml from 'sanitize-html';
import { marked } from 'marked';
import hljs from 'highlight.js';

// Configure marked with syntax highlighting
marked.setOptions({
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
  headerIds: false,
  breaks: true
});

const sanitizeOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
    'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
    'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'span'
  ],
  allowedAttributes: {
    'a': ['href', 'target', 'rel'],
    'img': ['src', 'alt'],
    'code': ['class'],
    'pre': ['class'],
    'span': ['class'],
    'div': ['class']
  },
  allowedClasses: {
    'code': ['language-*', 'hljs', 'hljs-*'],
    'pre': ['language-*', 'hljs', 'hljs-*'],
    'span': ['hljs-*']
  }
};

export const processContent = (content: string, contentType: string): string => {
  if (contentType === 'text') {
    // Process markdown and sanitize HTML
    const htmlContent = marked(content);
    return sanitizeHtml(htmlContent, sanitizeOptions);
  }

  if (contentType === 'code') {
    // For code blocks, only highlight syntax
    return hljs.highlightAuto(content).value;
  }

  return content;
};

export const extractMentions = (content: string): string[] => {
  const mentionRegex = /@(\w+)/g;
  const mentions = content.match(mentionRegex) || [];
  return mentions.map(mention => mention.slice(1));
};

export const validateCodeBlock = (code: string, language: string): boolean => {
  if (!code) return false;
  if (language && !hljs.getLanguage(language)) return false;
  return true;
};