declare global {
  namespace App {
    interface Platform {
      env: {
        DONATION_KV: KVNamespace;
      };
    }
  }
}
export {};
