import type { LogEntry } from './supabase';

export const getDisplayCategory = (entry: LogEntry): string => {
  const elementFromMessage = entry.error_msg.match(/Element '([^']+)'/i)?.[1]?.trim() || '';
  const attributeFromMessage = entry.error_msg.match(/attribute '([^']+)'/i)?.[1]?.trim() || '';

  const element = entry.element_name?.trim() || elementFromMessage;
  const attribute = entry.attribute_name?.trim() || attributeFromMessage;

  if (element) {
    return attribute ? `${element} (@${attribute})` : element;
  }

  return entry.category || 'Unknown';
};
