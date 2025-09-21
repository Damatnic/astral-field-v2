'use client';

import { useEffect } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocsPage() {
  useEffect(() => {
    // Add custom styles for dark theme
    const style = document.createElement('style');
    style.textContent = `
      .swagger-ui {
        font-family: system-ui, -apple-system, sans-serif;
      }
      .swagger-ui .topbar {
        background-color: #1a1a1a;
        padding: 1rem;
      }
      .swagger-ui .topbar .download-url-wrapper {
        display: none;
      }
      .swagger-ui .info {
        margin-bottom: 2rem;
      }
      .swagger-ui .scheme-container {
        background: #f5f5f5;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 2rem;
      }
      .swagger-ui .btn.authorize {
        background-color: #3b82f6;
        border-color: #3b82f6;
      }
      .swagger-ui .btn.authorize:hover {
        background-color: #2563eb;
        border-color: #2563eb;
      }
      .swagger-ui .opblock.opblock-post {
        border-color: #10b981;
      }
      .swagger-ui .opblock.opblock-post .opblock-summary-method {
        background: #10b981;
      }
      .swagger-ui .opblock.opblock-get {
        border-color: #3b82f6;
      }
      .swagger-ui .opblock.opblock-get .opblock-summary-method {
        background: #3b82f6;
      }
      .swagger-ui .opblock.opblock-put {
        border-color: #f59e0b;
      }
      .swagger-ui .opblock.opblock-put .opblock-summary-method {
        background: #f59e0b;
      }
      .swagger-ui .opblock.opblock-delete {
        border-color: #ef4444;
      }
      .swagger-ui .opblock.opblock-delete .opblock-summary-method {
        background: #ef4444;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gray-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">API Documentation</h1>
          <p className="text-gray-300">
            Interactive API documentation powered by OpenAPI 3.0
          </p>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="font-semibold text-blue-900 mb-2">Getting Started</h2>
          <ol className="list-decimal list-inside text-blue-800 space-y-1">
            <li>Obtain an API key from your dashboard</li>
            <li>Click the "Authorize" button below</li>
            <li>Enter your API key or JWT token</li>
            <li>Try out the endpoints interactively</li>
          </ol>
        </div>
        
        <SwaggerUI 
          url="/api/docs"
          docExpansion="none"
          deepLinking={true}
          displayOperationId={false}
          defaultModelsExpandDepth={1}
          defaultModelExpandDepth={1}
          showExtensions={true}
          showCommonExtensions={true}
          tryItOutEnabled={true}
          displayRequestDuration={true}
          filter={true}
          requestSnippetsEnabled={true}
          persistAuthorization={true}
        />
      </div>
    </div>
  );
}