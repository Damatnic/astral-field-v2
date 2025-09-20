declare module 'swagger-ui-react' {
  interface SwaggerUIProps {
    url?: string;
    spec?: any;
    onComplete?: (system: any) => void;
    requestInterceptor?: (request: any) => any;
    responseInterceptor?: (response: any) => any;
    onFailure?: (error: any) => void;
    docExpansion?: 'list' | 'full' | 'none';
    supportedSubmitMethods?: string[];
    dom_id?: string;
    domNode?: HTMLElement;
    presets?: any[];
    plugins?: any[];
    layout?: string;
    deepLinking?: boolean;
    showExtensions?: boolean;
    showCommonExtensions?: boolean;
    filter?: boolean | string;
    syntaxHighlight?: boolean | object;
    tryItOutEnabled?: boolean;
    requestSnippetsEnabled?: boolean;
    oauth2RedirectUrl?: string;
    persistAuthorization?: boolean;
    displayOperationId?: boolean;
    displayRequestDuration?: boolean;
    defaultModelsExpandDepth?: number;
    defaultModelExpandDepth?: number;
    defaultModelRendering?: 'example' | 'model';
    preauthorizeBasic?: object;
    preauthorizeApiKey?: object;
    withCredentials?: boolean;
  }

  const SwaggerUI: React.ComponentType<SwaggerUIProps>;
  export default SwaggerUI;
}