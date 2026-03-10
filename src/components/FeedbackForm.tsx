import { useState, useEffect } from 'react';
import emailjs from '@emailjs/browser';
import type { FormStatus } from '../types/index';

export function FeedbackForm() {
  const [formData, setFormData] = useState({ email: '', message: '' });
  const [formStatus, setFormStatus] = useState<FormStatus>({
    isSubmitting: false,
    isSuccess: false,
    isError: false,
    message: ''
  });

  const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_oek5h8g';
  const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_1zfstkg';
  const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'qek1xidpKLDofXa4z';

  useEffect(() => {
    if (EMAILJS_PUBLIC_KEY !== 'qek1xidpKLDofXa4z') {
      emailjs.init(EMAILJS_PUBLIC_KEY);
    }
  }, [EMAILJS_PUBLIC_KEY]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.message.trim() || !formData.email.trim()) {
      setFormStatus({
        isSubmitting: false,
        isSuccess: false,
        isError: true,
        message: !formData.email.trim() ? 'Please provide your email address.' : 'Please let us know how we can help.'
      });
      return;
    }

    if (!EMAILJS_PUBLIC_KEY || EMAILJS_PUBLIC_KEY === 'qrpDqd4BYagZAeDXk') {
      setFormStatus({
        isSubmitting: false,
        isSuccess: false,
        isError: true,
        message: 'EmailJS is not configured. Please contact the administrator.'
      });
      return;
    }

    setFormStatus({ isSubmitting: true, isSuccess: false, isError: false, message: '' });

    try {
      const templateParams = {
        from_email: formData.email,
        message: formData.message,
        to_email: 'ameenizhac@gmail.com'
      };

      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY);

      setFormStatus({
        isSubmitting: false,
        isSuccess: true,
        isError: false,
        message: 'Message sent successfully! We\'ll get back to you soon, God willing.'
      });

      setFormData({ email: '', message: '' });
    } catch (error) {
      console.error('EmailJS error:', error);
      setFormStatus({
        isSubmitting: false,
        isSuccess: false,
        isError: true,
        message: 'Failed to send message. Please try again or contact us directly.'
      });
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    fontSize: '16px',
    fontFamily: 'var(--font-family)',
    color: 'var(--color-text)',
    outline: 'none',
    transition: 'border-color var(--transition-fast)',
    boxSizing: 'border-box',
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: '14px',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: 'var(--color-surface)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}
    >
      <div style={{ fontSize: '13px', color: 'var(--color-text)', lineHeight: 1.5, fontWeight: 600 }}>
        Share feedback, report bugs, or suggest features you'd like to see.
      </div>
      <textarea
        name="message"
        placeholder="What needs fixing?"
        value={formData.message}
        onChange={handleInputChange}
        rows={3}
        style={{ ...inputStyle, resize: 'vertical' }}
      />
      <input
        type="email"
        name="email"
        placeholder="Email"
        required
        value={formData.email}
        onChange={handleInputChange}
        style={inputStyle}
      />
      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
        Your email is needed to sometimes ask for clarification if feedback is not clear.
      </div>
      {formStatus.message && (
        <div style={{
          fontSize: '12px',
          color: formStatus.isError ? 'var(--color-danger)' : 'var(--color-primary)',
          fontWeight: 500,
        }}>
          {formStatus.message}
        </div>
      )}
      <button
        type="submit"
        disabled={formStatus.isSubmitting}
        style={{
          alignSelf: 'flex-end',
          padding: '8px 18px',
          backgroundColor: formStatus.isSubmitting ? 'var(--color-text-muted)' : 'var(--color-primary)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          cursor: formStatus.isSubmitting ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          fontWeight: 600,
          fontFamily: 'var(--font-family)',
          transition: 'background var(--transition-fast)',
        }}
      >
        {formStatus.isSubmitting ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  );
}
