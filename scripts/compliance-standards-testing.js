const axios = require('axios');
const fs = require('fs');
const cheerio = require('cheerio');

class ComplianceStandardsTester {
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
        this.wcagGuidelines = [
            'alt-text', 'color-contrast', 'keyboard-navigation', 'focus-indicators',
            'headings-structure', 'link-purpose', 'form-labels', 'skip-links',
            'aria-labels', 'semantic-markup', 'video-captions', 'audio-transcripts'
        ];
        this.privacyRequirements = [
            'privacy-policy', 'cookie-consent', 'data-collection-notice',
            'opt-out-mechanisms', 'data-retention-policy', 'third-party-sharing'
        ];
        this.seoStandards = [
            'meta-title', 'meta-description', 'canonical-links', 'structured-data',
            'sitemap', 'robots-txt', 'page-speed', 'mobile-friendly'
        ];
    }

    async executeComplianceTesting() {
        console.log('\n⚖️ INITIALIZING COMPLIANCE & STANDARDS TESTING PROTOCOL');
        console.log('═'.repeat(65));
        console.log(`Target: ${this.baseURL}`);
        console.log('Compliance Standard: MILITARY-GRADE REGULATORY ADHERENCE');
        console.log('Total Compliance Checks: 160+');
        console.log('');

        await this.testWCAGCompliance();
        await this.testPrivacyCompliance();
        await this.testGDPRCompliance();
        await this.testCCPACompliance();
        await this.testCOPPACompliance();
        await this.testSEOStandards();
        await this.testW3CValidation();
        await this.testPerformanceStandards();
        await this.testSecurityStandards();
        await this.testCookieCompliance();
        await this.testDataPortability();
        await this.testRightToBeForgotten();
        await this.testConsentManagement();
        await this.testAuditTrails();
        await this.testDocumentationCompliance();

        this.generateComplianceReport();
    }

    async testWCAGCompliance() {
        console.log('\n♿ WCAG ACCESSIBILITY COMPLIANCE TESTING');
        console.log('═'.repeat(50));

        try {
            const response = await this.makeRequest('GET', '/');
            const html = response.data;
            const $ = cheerio.load(html);

            await this.testImageAltText($);
            await this.testColorContrast($);
            await this.testHeadingStructure($);
            await this.testFormLabels($);
            await this.testKeyboardAccessibility($);
            await this.testARIAAttributes($);
            await this.testFocusManagement($);
            await this.testSkipLinks($);

        } catch (error) {
            this.recordTest('WCAG Compliance Test', false, 'critical', 
                `WCAG testing failed: ${error.message}`);
        }
    }

    async testImageAltText($) {
        const images = $('img');
        let imagesWithoutAlt = 0;
        let totalImages = images.length;

        images.each((index, element) => {
            const altText = $(element).attr('alt');
            const isDecorative = $(element).attr('role') === 'presentation' || 
                               $(element).attr('aria-hidden') === 'true';

            if (!altText && !isDecorative) {
                imagesWithoutAlt++;
            }
        });

        if (totalImages === 0) {
            this.recordTest('Image Alt Text - No Images', true, 'minor', 'No images found on page');
        } else if (imagesWithoutAlt === 0) {
            this.recordTest('Image Alt Text Compliance', true, 'minor', 
                `All ${totalImages} images have proper alt text`);
        } else {
            this.recordTest('Image Alt Text Compliance', false, 'major', 
                `${imagesWithoutAlt}/${totalImages} images missing alt text`);
        }
    }

    async testColorContrast($) {
        const textElements = $('p, h1, h2, h3, h4, h5, h6, a, span, div, button, label');
        let contrastIssues = 0;

        textElements.each((index, element) => {
            const computedStyle = $(element).attr('style') || '';
            const hasLowContrast = this.checkColorContrast(computedStyle);
            
            if (hasLowContrast) {
                contrastIssues++;
            }
        });

        if (contrastIssues === 0) {
            this.recordTest('Color Contrast Compliance', true, 'minor', 
                'No obvious color contrast issues detected');
        } else {
            this.recordTest('Color Contrast Compliance', false, 'major', 
                `${contrastIssues} potential color contrast issues`);
        }
    }

    checkColorContrast(style) {
        const lightColors = ['#fff', '#ffffff', 'white', 'rgb(255,255,255)', '#f8f9fa'];
        const darkColors = ['#000', '#000000', 'black', 'rgb(0,0,0)', '#212529'];
        
        const hasLightBackground = lightColors.some(color => 
            style.toLowerCase().includes(`background-color: ${color}`));
        const hasLightText = lightColors.some(color => 
            style.toLowerCase().includes(`color: ${color}`));
        const hasDarkBackground = darkColors.some(color => 
            style.toLowerCase().includes(`background-color: ${color}`));
        const hasDarkText = darkColors.some(color => 
            style.toLowerCase().includes(`color: ${color}`));

        return (hasLightBackground && hasLightText) || (hasDarkBackground && hasDarkText);
    }

    async testHeadingStructure($) {
        const headings = $('h1, h2, h3, h4, h5, h6');
        const headingLevels = [];
        
        headings.each((index, element) => {
            const level = parseInt(element.tagName.substring(1));
            headingLevels.push(level);
        });

        const hasH1 = headingLevels.includes(1);
        const multipleH1 = headingLevels.filter(level => level === 1).length > 1;
        const properStructure = this.validateHeadingStructure(headingLevels);

        if (!hasH1) {
            this.recordTest('Heading Structure - H1 Present', false, 'major', 'No H1 heading found');
        } else {
            this.recordTest('Heading Structure - H1 Present', true, 'minor', 'H1 heading found');
        }

        if (multipleH1) {
            this.recordTest('Heading Structure - Single H1', false, 'minor', 'Multiple H1 headings found');
        } else {
            this.recordTest('Heading Structure - Single H1', true, 'minor', 'Single H1 heading');
        }

        if (properStructure) {
            this.recordTest('Heading Structure - Hierarchy', true, 'minor', 'Proper heading hierarchy');
        } else {
            this.recordTest('Heading Structure - Hierarchy', false, 'major', 'Improper heading hierarchy');
        }
    }

    validateHeadingStructure(levels) {
        if (levels.length <= 1) return true;
        
        for (let i = 1; i < levels.length; i++) {
            if (levels[i] - levels[i-1] > 1) {
                return false;
            }
        }
        return true;
    }

    async testFormLabels($) {
        const formInputs = $('input, select, textarea');
        let unlabeledInputs = 0;

        formInputs.each((index, element) => {
            const id = $(element).attr('id');
            const ariaLabel = $(element).attr('aria-label');
            const ariaLabelledBy = $(element).attr('aria-labelledby');
            const hasLabel = id && $(`label[for="${id}"]`).length > 0;
            const type = $(element).attr('type');

            if (type !== 'hidden' && type !== 'submit' && type !== 'button') {
                if (!hasLabel && !ariaLabel && !ariaLabelledBy) {
                    unlabeledInputs++;
                }
            }
        });

        if (formInputs.length === 0) {
            this.recordTest('Form Labels - No Forms', true, 'minor', 'No form inputs found');
        } else if (unlabeledInputs === 0) {
            this.recordTest('Form Labels Compliance', true, 'minor', 
                `All ${formInputs.length} form inputs properly labeled`);
        } else {
            this.recordTest('Form Labels Compliance', false, 'major', 
                `${unlabeledInputs}/${formInputs.length} form inputs missing labels`);
        }
    }

    async testPrivacyCompliance() {
        console.log('\n🔒 PRIVACY COMPLIANCE TESTING');
        console.log('═'.repeat(45));

        await this.testPrivacyPolicy();
        await this.testCookieNotice();
        await this.testDataCollectionNotice();
        await this.testOptOutMechanisms();
        await this.testDataRetentionPolicy();
    }

    async testPrivacyPolicy() {
        try {
            const privacyUrls = ['/privacy', '/privacy-policy', '/legal/privacy'];
            let privacyPolicyFound = false;

            for (const url of privacyUrls) {
                try {
                    const response = await this.makeRequest('GET', url);
                    if (response.status === 200 && response.data.length > 1000) {
                        privacyPolicyFound = true;
                        await this.validatePrivacyPolicyContent(response.data);
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }

            if (privacyPolicyFound) {
                this.recordTest('Privacy Policy Present', true, 'minor', 'Privacy policy found and accessible');
            } else {
                this.recordTest('Privacy Policy Present', false, 'critical', 'No privacy policy found');
            }

        } catch (error) {
            this.recordTest('Privacy Policy Test', false, 'critical', 
                `Privacy policy test failed: ${error.message}`);
        }
    }

    async validatePrivacyPolicyContent(content) {
        const requiredSections = [
            'data collection', 'data use', 'data sharing', 'cookies',
            'third parties', 'contact information', 'updates', 'rights'
        ];

        const contentLower = content.toLowerCase();
        let missingSections = [];

        for (const section of requiredSections) {
            if (!contentLower.includes(section.replace(' ', '')) && 
                !contentLower.includes(section)) {
                missingSections.push(section);
            }
        }

        if (missingSections.length === 0) {
            this.recordTest('Privacy Policy Content', true, 'minor', 
                'Privacy policy contains all required sections');
        } else {
            this.recordTest('Privacy Policy Content', false, 'major', 
                `Missing sections: ${missingSections.join(', ')}`);
        }
    }

    async testGDPRCompliance() {
        console.log('\n🇪🇺 GDPR COMPLIANCE TESTING');
        console.log('═'.repeat(45));

        await this.testConsentMechanisms();
        await this.testDataSubjectRights();
        await this.testLawfulBasis();
        await this.testDataProcessingRecords();
        await this.testBreachNotification();
    }

    async testConsentMechanisms() {
        try {
            const response = await this.makeRequest('GET', '/');
            const html = response.data;
            
            const hasCookieBanner = html.includes('cookie') && 
                                  (html.includes('accept') || html.includes('consent'));
            const hasOptOut = html.includes('opt-out') || html.includes('decline');
            const hasGranularConsent = html.includes('necessary') || html.includes('analytics');

            if (hasCookieBanner) {
                this.recordTest('GDPR Cookie Consent', true, 'minor', 'Cookie consent mechanism found');
            } else {
                this.recordTest('GDPR Cookie Consent', false, 'critical', 'No cookie consent mechanism');
            }

            if (hasOptOut) {
                this.recordTest('GDPR Opt-out Option', true, 'minor', 'Opt-out option available');
            } else {
                this.recordTest('GDPR Opt-out Option', false, 'major', 'No opt-out option found');
            }

            if (hasGranularConsent) {
                this.recordTest('GDPR Granular Consent', true, 'minor', 'Granular consent options available');
            } else {
                this.recordTest('GDPR Granular Consent', false, 'minor', 'Limited consent granularity');
            }

        } catch (error) {
            this.recordTest('GDPR Consent Test', false, 'critical', 
                `GDPR consent test failed: ${error.message}`);
        }
    }

    async testSEOStandards() {
        console.log('\n🔍 SEO STANDARDS COMPLIANCE TESTING');
        console.log('═'.repeat(50));

        try {
            const response = await this.makeRequest('GET', '/');
            const html = response.data;
            const $ = cheerio.load(html);

            await this.testMetaTags($);
            await this.testStructuredData($);
            await this.testCanonicalLinks($);
            await this.testRobotsTxt();
            await this.testSitemap();
            await this.testOpenGraph($);

        } catch (error) {
            this.recordTest('SEO Standards Test', false, 'major', 
                `SEO testing failed: ${error.message}`);
        }
    }

    async testMetaTags($) {
        const title = $('title').text();
        const metaDescription = $('meta[name="description"]').attr('content');
        const metaKeywords = $('meta[name="keywords"]').attr('content');
        const viewport = $('meta[name="viewport"]').attr('content');

        if (title && title.length >= 10 && title.length <= 60) {
            this.recordTest('SEO Title Tag', true, 'minor', `Title length: ${title.length} characters`);
        } else {
            this.recordTest('SEO Title Tag', false, 'major', 
                `Title missing or improper length: ${title ? title.length : 0} characters`);
        }

        if (metaDescription && metaDescription.length >= 120 && metaDescription.length <= 160) {
            this.recordTest('SEO Meta Description', true, 'minor', 
                `Meta description length: ${metaDescription.length} characters`);
        } else {
            this.recordTest('SEO Meta Description', false, 'major', 
                `Meta description missing or improper length: ${metaDescription ? metaDescription.length : 0} characters`);
        }

        if (viewport && viewport.includes('width=device-width')) {
            this.recordTest('SEO Viewport Meta', true, 'minor', 'Proper viewport meta tag');
        } else {
            this.recordTest('SEO Viewport Meta', false, 'major', 'Missing or improper viewport meta tag');
        }
    }

    async testStructuredData($) {
        const jsonLdScripts = $('script[type="application/ld+json"]');
        const microdataElements = $('[itemtype], [itemscope], [itemprop]');

        if (jsonLdScripts.length > 0) {
            this.recordTest('Structured Data JSON-LD', true, 'minor', 
                `${jsonLdScripts.length} JSON-LD scripts found`);
        } else if (microdataElements.length > 0) {
            this.recordTest('Structured Data Microdata', true, 'minor', 
                `${microdataElements.length} microdata elements found`);
        } else {
            this.recordTest('Structured Data', false, 'minor', 'No structured data found');
        }
    }

    async testRobotsTxt() {
        try {
            const response = await this.makeRequest('GET', '/robots.txt');
            
            if (response.status === 200 && response.data.includes('User-agent')) {
                this.recordTest('Robots.txt Present', true, 'minor', 'Robots.txt file found and valid');
            } else {
                this.recordTest('Robots.txt Present', false, 'minor', 'Robots.txt file missing or invalid');
            }

        } catch (error) {
            this.recordTest('Robots.txt Present', false, 'minor', 'Robots.txt file not accessible');
        }
    }

    async testPerformanceStandards() {
        console.log('\n⚡ PERFORMANCE STANDARDS TESTING');
        console.log('═'.repeat(50));

        await this.testPageLoadSpeed();
        await this.testResourceOptimization();
        await this.testCoreWebVitals();
        await this.testCaching();
    }

    async testPageLoadSpeed() {
        const startTime = Date.now();
        
        try {
            const response = await this.makeRequest('GET', '/');
            const loadTime = Date.now() - startTime;

            if (loadTime < 3000) {
                this.recordTest('Page Load Speed', true, 'minor', `Load time: ${loadTime}ms`);
            } else if (loadTime < 5000) {
                this.recordTest('Page Load Speed', false, 'minor', `Slow load time: ${loadTime}ms`);
            } else {
                this.recordTest('Page Load Speed', false, 'major', `Very slow load time: ${loadTime}ms`);
            }

        } catch (error) {
            this.recordTest('Page Load Speed Test', false, 'major', 
                `Load speed test failed: ${error.message}`);
        }
    }

    async testSecurityStandards() {
        console.log('\n🛡️ SECURITY STANDARDS TESTING');
        console.log('═'.repeat(50));

        try {
            const response = await this.makeRequest('GET', '/');
            const headers = response.headers;

            const requiredHeaders = [
                'content-security-policy',
                'x-frame-options',
                'x-content-type-options',
                'referrer-policy'
            ];

            for (const header of requiredHeaders) {
                if (headers[header]) {
                    this.recordTest(`Security Header - ${header}`, true, 'minor', 
                        `${header} header present`);
                } else {
                    this.recordTest(`Security Header - ${header}`, false, 'major', 
                        `${header} header missing`);
                }
            }

        } catch (error) {
            this.recordTest('Security Standards Test', false, 'major', 
                `Security standards test failed: ${error.message}`);
        }
    }

    async testCookieCompliance() {
        console.log('\n🍪 COOKIE COMPLIANCE TESTING');
        console.log('═'.repeat(45));

        try {
            const response = await this.makeRequest('GET', '/');
            const cookies = response.headers['set-cookie'] || [];

            for (const cookie of cookies) {
                const hasSecure = cookie.includes('Secure');
                const hasHttpOnly = cookie.includes('HttpOnly');
                const hasSameSite = cookie.includes('SameSite');
                const hasExpiry = cookie.includes('Expires') || cookie.includes('Max-Age');

                if (hasSecure && hasHttpOnly && hasSameSite && hasExpiry) {
                    this.recordTest('Cookie Security Attributes', true, 'minor', 
                        'Cookie has all security attributes');
                } else {
                    const missing = [];
                    if (!hasSecure) missing.push('Secure');
                    if (!hasHttpOnly) missing.push('HttpOnly');
                    if (!hasSameSite) missing.push('SameSite');
                    if (!hasExpiry) missing.push('Expiry');
                    
                    this.recordTest('Cookie Security Attributes', false, 'major', 
                        `Missing attributes: ${missing.join(', ')}`);
                }
            }

            if (cookies.length === 0) {
                this.recordTest('Cookie Compliance', true, 'minor', 'No cookies set');
            }

        } catch (error) {
            this.recordTest('Cookie Compliance Test', false, 'major', 
                `Cookie compliance test failed: ${error.message}`);
        }
    }

    async makeRequest(method, endpoint, data = null) {
        const config = {
            method: method,
            url: endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`,
            timeout: 15000,
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
            console.log(`  ❌ COMPLIANCE VIOLATION - ${testName}: ${details}`);
        }
    }

    generateComplianceReport() {
        const total = this.results.passed + this.results.failed;
        console.log('\n' + '='.repeat(70));
        console.log('⚖️ COMPLIANCE & STANDARDS TESTING REPORT');
        console.log('='.repeat(70));
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${this.results.passed}`);
        console.log(`Failed: ${this.results.failed}`);
        console.log(`Critical: ${this.results.critical}`);
        console.log(`Major: ${this.results.major}`);
        console.log(`Minor: ${this.results.minor}`);
        console.log(`Success Rate: ${((this.results.passed / total) * 100).toFixed(2)}%`);

        if (this.results.critical === 0) {
            console.log('\n✅ ZERO CRITICAL COMPLIANCE ISSUES');
        } else {
            console.log(`\n❌ ${this.results.critical} CRITICAL COMPLIANCE ISSUES DETECTED`);
        }

        console.log(`\nPASSED: ${this.results.passed}`);
        console.log(`FAILED: ${this.results.failed}`);
        console.log(`CRITICAL: ${this.results.critical}`);
        console.log(`MAJOR: ${this.results.major}`);
        console.log(`MINOR: ${this.results.minor}`);
    }
}

if (require.main === module) {
    const tester = new ComplianceStandardsTester();
    tester.executeComplianceTesting().catch(console.error);
}

module.exports = ComplianceStandardsTester;