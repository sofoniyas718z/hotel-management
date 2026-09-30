import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuth from '../context/AuthContext';
import './PaymentSuccess.css';

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useContext(useAuth);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirmPayment = async () => {
      try {
        const tx_ref = searchParams.get('tx_ref');
        const booking_id = searchParams.get('booking_id');
        const status = searchParams.get('status');

        if (status === 'success' && tx_ref && booking_id) {
          // Confirm payment with backend
          const response = await fetch('http://localhost/hotel-management/backend/api/payment-success.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tx_ref,
              booking_id
            }),
          });

          const result = await response.json();

          if (result.success) {
            setStatus('success');
            setMessage('Payment completed successfully! Your booking has been confirmed.');
            
            // Redirect to bookings page after 3 seconds
            setTimeout(() => {
              navigate('/my-bookings');
            }, 3000);
          } else {
            setStatus('error');
            setMessage(result.error || 'Payment confirmation failed.');
          }
        } else {
          setStatus('error');
          setMessage('Invalid payment response.');
        }
      } catch (error) {
        console.error('Payment confirmation error:', error);
        setStatus('error');
        setMessage('Failed to confirm payment. Please check your bookings.');
      }
    };

    confirmPayment();
  }, [searchParams, navigate]);

  return (
    <div className="payment-success-container">
      <div className="payment-success-card">
        {status === 'loading' && (
          <>
            <div className="loading-spinner"></div>
            <h2>Confirming Payment...</h2>
            <p>Please wait while we confirm your payment.</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="success-icon">✓</div>
            <h2>Payment Successful!</h2>
            <p>{message}</p>
            <p>Redirecting to your bookings...</p>
            <button 
              onClick={() => navigate('/my-bookings')}
              className="view-bookings-btn"
            >
              View My Bookings Now
            </button>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="error-icon">✗</div>
            <h2>Payment Issue</h2>
            <p>{message}</p>
            <div className="action-buttons">
              <button 
                onClick={() => navigate('/my-bookings')}
                className="view-bookings-btn"
              >
                Check My Bookings
              </button>
              <button 
                onClick={() => navigate('/')}
                className="home-btn"
              >
                Return to Home
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;