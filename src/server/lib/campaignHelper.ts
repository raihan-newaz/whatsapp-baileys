
/**
 * Processes spintax in a message string.
 * Format: {option1|option2|option3}
 */
export function processSpintax(text: string): string {
  return text.replace(/{([^{}]+)}/g, (match, options) => {
    const parts = options.split('|');
    return parts[Math.floor(Math.random() * parts.length)].trim();
  });
}

/**
 * Applies uniqueness to a message based on the specified mode.
 */
export function applyUniqueness(text: string, mode: string): string {
  if (mode === 'none') return text;

  const emojis = ['✨', '🚀', '⭐', '📍', '✅', '💡', '🔥', '📈', '👋', '🙌', '🎯', '⚡', '🌟', '💎'];
  const ghostChars = ['\u200B', '\u200C', '\u200D', '\u200E', '\u200F'];

  let result = text;

  if (mode === 'emoji' || mode === 'smart') {
    result += ' ' + emojis[Math.floor(Math.random() * emojis.length)];
  }

  if (mode === 'invisible' || mode === 'smart') {
    const count = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < count; j++) {
      result += ghostChars[Math.floor(Math.random() * ghostChars.length)];
    }
  }

  return result;
}

/**
 * Replaces placeholders in a message with contact specific values.
 */
export function replacePlaceholders(text: string, contact: { name?: string; phone?: string }): string {
  return text
    .replace(/{name}/g, contact.name || '')
    .replace(/{phone}/g, contact.phone || '');
}

/**
 * Orchestrates message preparation for a campaign.
 */
export function prepareMessage(
  templateContent: string,
  contact: { name?: string; phone?: string },
  options: { spintax?: boolean; uniqueness?: string }
): string {
  let msg = templateContent;

  // 1. Spintax
  if (options.spintax) {
    msg = processSpintax(msg);
  }

  // 2. Placeholders
  msg = replacePlaceholders(msg, contact);

  // 3. Uniqueness
  if (options.uniqueness) {
    msg = applyUniqueness(msg, options.uniqueness);
  }

  return msg;
}
