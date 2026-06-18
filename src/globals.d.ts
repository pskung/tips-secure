declare module "*.css";

interface Window {
  turnstile?: {
    render: (container: string | HTMLElement, options: any) => string;
    reset: (widgetId: string) => void;
    remove: (widgetId: string) => void;
  };
}
