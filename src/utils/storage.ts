/**
 * Utility generators for unique Equipment IDs and 13.56MHz RFID Hex UIDs.
 * Main persistent database is managed by the Express + SQLite backend (/server.ts).
 */

export function generateId(prefix: string): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${num}`;
}

export function generateRfidTag(): string {
  const hex = '0123456789ABCDEF';
  let tag = 'E200';
  for (let i = 0; i < 8; i++) {
    tag += hex.charAt(Math.floor(Math.random() * hex.length));
  }
  return tag;
}
