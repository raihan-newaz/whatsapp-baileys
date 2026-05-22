declare var console: any;
declare var process: any;
declare var Buffer: any;
declare var __dirname: string;
declare function setTimeout(callback: (...args: any[]) => void, ms: number, ...args: any[]): any;
declare function clearTimeout(timeoutId: any): void;
declare function setInterval(callback: (...args: any[]) => void, ms: number, ...args: any[]): any;
declare function clearInterval(intervalId: any): void;

declare module 'fs';
declare module 'path';
declare module 'whatsapp-web.js';
declare module 'qrcode-terminal';
declare module 'multer';
