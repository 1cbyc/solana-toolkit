// Jest setup file for ES modules
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock crypto for Node.js environment
if (!global.crypto) {
  global.crypto = {
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    subtle: {
      digest: async (algorithm, data) => {
        // Simple mock implementation
        const encoder = new TextEncoder();
        const hashBuffer = encoder.encode(data.toString() + algorithm);
        return hashBuffer;
      }
    }
  };
} 