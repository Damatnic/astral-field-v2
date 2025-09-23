'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SimpleLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const testLogin = async (email: string) => {
    console.log(`Testing login for ${email}...`);
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch('/api/auth/simple-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email,
          password: 'Dynasty2025!'
        })
      });
      
      const data = await response.json();
      console.log('Login response:', data);
      
      if (response.ok && data.success) {
        setSuccess(`✅ Login successful! User: ${data.user.name}`);
        
        // Test session
        const sessionCheck = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        
        const sessionData = await sessionCheck.json();
        console.log('Session check:', sessionData);
        
        if (sessionCheck.ok && sessionData.success) {
          setSuccess(prev => prev + '\n✅ Session verified!');
          
          // Redirect after 2 seconds
          setTimeout(() => {
            console.log('Redirecting to dashboard...');
            window.location.href = '/dashboard';
          }, 2000);
        }
      } else {
        setError(`❌ Login failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      maxWidth: '600px', 
      margin: '50px auto', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>Simple Login Test</h1>
      <p>This page tests the login functionality directly.</p>
      
      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button 
          onClick={() => testLogin('nicholas.damato@test.com')}
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: loading ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Loading...' : 'Login as Nicholas D\'Amato'}
        </button>
        
        <button 
          onClick={() => testLogin('nick.hartley@test.com')}
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: loading ? '#ccc' : '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Loading...' : 'Login as Nick Hartley'}
        </button>
      </div>
      
      {error && (
        <div style={{
          marginTop: '20px',
          padding: '10px',
          background: '#ffebee',
          color: '#c62828',
          borderRadius: '4px',
          whiteSpace: 'pre-wrap'
        }}>
          {error}
        </div>
      )}
      
      {success && (
        <div style={{
          marginTop: '20px',
          padding: '10px',
          background: '#e8f5e9',
          color: '#2e7d32',
          borderRadius: '4px',
          whiteSpace: 'pre-wrap'
        }}>
          {success}
        </div>
      )}
    </div>
  );
}