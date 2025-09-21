
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.svg' {
  const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      DATABASE_URL: string;
      DIRECT_DATABASE_URL: string;
      AUTH0_DOMAIN: string;
      AUTH0_CLIENT_ID: string;
      AUTH0_CLIENT_SECRET: string;
      AUTH0_AUDIENCE: string;
      NEXTAUTH_URL: string;
      NEXTAUTH_SECRET: string;
      ESPN_BASE_URL: string;
      ESPN_FANTASY_URL: string;
      NEXT_PUBLIC_APP_URL: string;
      ENABLE_LIVE_SCORING: string;
      ENABLE_NEWS_FEED: string;
      ENABLE_PLAYER_SYNC: string;
      SCORE_REFRESH_INTERVAL: string;
      NEWS_REFRESH_INTERVAL: string;
      PLAYER_REFRESH_INTERVAL: string;
    }
  }
  
  interface Window {
    gtag?: (...args: any[]) => void;
  }
  
  var global: typeof globalThis;
}

export {};
