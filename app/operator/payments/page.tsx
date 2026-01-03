'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, CreditCard, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface SubscriptionInfo {
  planName: string;
  status: string;
  amount: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  daysUntilRenewal: number;
  caseLimit: number;
  currentUsage: number;
  usagePercentage: number;
  cancelAtPeriodEnd: boolean;
}

interface InvoiceInfo {
  id: string;
  amount: number;
  status: string;
  date: string;
  dueDate?: string;
  paidDate?: string;
}

interface AvailablePlan {
  id: string;
  name: string;
  stripe_price_id: string | null;
  price: number | null;
  monthly_limit: number | null;
}

export default function OperatorPaymentsPage() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [invoices, setInvoices] = useState<InvoiceInfo[]>([]);
  const [availablePlans, setAvailablePlans] = useState<AvailablePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [cancelMessage, setCancelMessage] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null); // Track which plan is being checked out
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelType, setCancelType] = useState<'immediate' | 'end_of_period'>('end_of_period');

  useEffect(() => {
    // Check URL parameters for checkout results
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get('success') === 'true') {
      setSuccessMessage('Payment successful! Your subscription has been activated.');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (urlParams.get('canceled') === 'true') {
      setCancelMessage('Payment was canceled. You can try again anytime.');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Check if user just returned from Stripe checkout
    const checkoutStarted = sessionStorage.getItem('stripe_checkout_started');
    if (checkoutStarted) {
      console.log('🔄 Detected return from Stripe checkout, refreshing subscription data...');
      sessionStorage.removeItem('stripe_checkout_started');
      // Add a small delay to allow webhook processing
      setTimeout(() => {
        fetchPaymentInfo();
      }, 2000);
    } else {
      fetchPaymentInfo();
    }
  }, []);

  const fetchPaymentInfo = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/operator/payments');
      const data = await response.json();
      
      // #region agent log - frontend data received
      fetch('http://127.0.0.1:7242/ingest/1b3163b7-f1ae-4e91-bf21-62593b0c9267', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'app/operator/payments/page.tsx:fetchPaymentInfo',
          message: 'Payment data received from API',
          data: {
            success: data.success,
            subscription: data.subscription ? {
              id: data.subscription.id,
              planName: data.subscription.planName,
              amount: data.subscription.amount,
              status: data.subscription.status,
              cancelAtPeriodEnd: data.subscription.cancelAtPeriodEnd
            } : null,
            availablePlansCount: data.availablePlans?.length || 0
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'initial-run',
          hypothesisId: 'A,B,E'
        })
      }).catch(() => {});
      // #endregion

      if (data.success) {
        setSubscription(data.subscription);
        setInvoices(data.invoices || []);
        setAvailablePlans(data.availablePlans || []);
      } else {
        setError(data.error || 'Failed to load payment information');
      }
    } catch (err) {
      setError('Failed to load payment information');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-500 bg-green-900/20';
      case 'trialing':
        return 'text-blue-500 bg-blue-900/20';
      case 'incomplete':
        return 'text-yellow-500 bg-yellow-900/20';
      case 'past_due':
        return 'text-orange-500 bg-orange-900/20';
      case 'canceled':
        return 'text-red-500 bg-red-900/20';
      default:
        return 'text-zinc-500 bg-zinc-900/20';
    }
  };

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-500 bg-green-900/20';
      case 'pending':
        return 'text-yellow-500 bg-yellow-900/20';
      case 'overdue':
        return 'text-red-500 bg-red-900/20';
      default:
        return 'text-zinc-500 bg-zinc-900/20';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/operator"
            className="flex items-center gap-2 px-3 py-2 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 text-xs font-bold uppercase tracking-widest transition-all"
          >
            <ArrowLeft size={14} />
            Dashboard
          </Link>
          <div>
            <h2 className="text-4xl font-serif font-bold text-white uppercase tracking-tight">Billing & Payments</h2>
            <p className="text-zinc-500 text-sm mt-2">Subscription and invoice management</p>
          </div>
        </div>
        <button
          onClick={fetchPaymentInfo}
          className="flex items-center gap-2 px-4 py-2 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 text-xs font-bold uppercase tracking-widest transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 p-6 flex items-start gap-3">
          <AlertCircle className="text-red-500 shrink-0 mt-1" size={20} />
          <div>
            <p className="text-red-400 font-bold">Error</p>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-900/20 border border-green-800 p-6 flex items-start gap-3">
          <CheckCircle className="text-green-500 shrink-0 mt-1" size={20} />
          <div>
            <p className="text-green-400 font-bold">Success</p>
            <p className="text-green-300 text-sm mt-1">{successMessage}</p>
          </div>
        </div>
      )}

      {cancelMessage && (
        <div className="bg-orange-900/20 border border-orange-800 p-6 flex items-start gap-3">
          <AlertCircle className="text-orange-500 shrink-0 mt-1" size={20} />
          <div>
            <p className="text-orange-400 font-bold">Payment Canceled</p>
            <p className="text-orange-300 text-sm mt-1">{cancelMessage}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500">
          <RefreshCw className="animate-spin mr-2" size={20} />
          Loading payment information...
        </div>
      ) : subscription && (subscription.status === 'active' || subscription.status === 'trialing' || subscription.status === 'incomplete') ? (
        <>
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 p-8">
            <div className="flex items-center gap-3 mb-6">
              <CreditCard className="text-green-500" size={24} />
              <h3 className="text-xl font-serif font-bold text-white uppercase tracking-tight">
                Current Subscription
              </h3>
            </div>

            <div className="bg-zinc-800 p-6 rounded">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-xl font-semibold text-white">{subscription.planName}</h4>
                  <p className="text-zinc-400">${(subscription.amount / 100).toFixed(2)}/month</p>
                </div>
                <div className="text-right">
                  <div className={`text-xs px-3 py-1 rounded uppercase tracking-widest ${
                    subscription.cancelAtPeriodEnd
                      ? 'bg-orange-900/20 text-orange-500'
                      : subscription.status === 'active'
                      ? 'bg-green-900/20 text-green-500'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {subscription.cancelAtPeriodEnd ? 'CANCELLING' : subscription.status}
                  </div>
                  {subscription.cancelAtPeriodEnd ? (
                    <p className="text-xs text-orange-400 mt-1 font-medium">
                      ⚠️ Ends on {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'period end'}
                    </p>
                  ) : subscription.daysUntilRenewal > 0 ? (
                    <p className="text-xs text-zinc-500 mt-1">
                      Renews in {subscription.daysUntilRenewal} days
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCancelDialog(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                  disabled={cancelLoading}
                >
                  Cancel Subscription
                </button>
                <button
                  onClick={fetchPaymentInfo}
                  className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                >
                  Refresh Status
                </button>
              </div>
            </div>
          </div>

          {/* Cancel Subscription Dialog */}
          {showCancelDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-lg max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-white mb-4">Cancel Subscription</h3>
                <p className="text-zinc-400 mb-6">
                  {cancelType === 'end_of_period'
                    ? `Your subscription will remain active until ${subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'the end of your current billing period'}. After that date, you will lose access and need to subscribe again to continue using the service.`
                    : 'Your subscription will end immediately and you will lose access right away. This action cannot be undone.'
                  }
                </p>

                <div className="space-y-3 mb-6">
                  <label className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="cancelType"
                      value="end_of_period"
                      checked={cancelType === 'end_of_period'}
                      onChange={(e) => setCancelType(e.target.value as 'end_of_period')}
                      className="text-orange-500"
                    />
                    <div>
                      <p className="text-white font-medium">Cancel at period end</p>
                      <p className="text-zinc-400 text-sm">Keep access until {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'billing period ends'}</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="cancelType"
                      value="immediate"
                      checked={cancelType === 'immediate'}
                      onChange={(e) => setCancelType(e.target.value as 'immediate')}
                      className="text-orange-500"
                    />
                    <div>
                      <p className="text-white font-medium">Cancel immediately</p>
                      <p className="text-zinc-400 text-sm">Lose access right away</p>
                    </div>
                  </label>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      try {
                        setCancelLoading(true);
                        // We need to get the subscription ID from the database
                        // For now, we'll use a placeholder - this needs to be implemented
                        const response = await fetch('/api/operator/payments/cancel', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            subscriptionId: subscription.id,
                            cancelType
                          })
                        });

                        const data = await response.json();

                        if (data.success) {
                          setShowCancelDialog(false);
                          const message = cancelType === 'end_of_period'
                            ? `Subscription will end on ${subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'your billing period end date'}. You'll keep access until then.`
                            : 'Subscription cancelled successfully. Access ended immediately.';
                          setSuccessMessage(message);
                          fetchPaymentInfo(); // Refresh data
                        } else {
                          alert(`Error: ${data.error || 'Failed to cancel subscription'}`);
                        }
                      } catch (error) {
                        console.error('Cancel error:', error);
                        alert('Failed to cancel subscription. Please try again.');
                      } finally {
                        setCancelLoading(false);
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex-1"
                    disabled={cancelLoading}
                  >
                    {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                  </button>
                  <button
                    onClick={() => setShowCancelDialog(false)}
                    className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                  >
                    Keep Subscription
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </>
      ) : (
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 p-8">
            <div className="flex items-center gap-3 mb-6">
              <CreditCard className="text-blue-500" size={24} />
              <h3 className="text-xl font-serif font-bold text-white uppercase tracking-tight">
                Choose Your Plan
              </h3>
            </div>
            <p className="text-zinc-400 mb-6">
              Select a subscription plan to get started with our services. All plans include case management, document storage, and priority support.
            </p>

            {availablePlans.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-zinc-500">No plans are currently available. Please contact support.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availablePlans.map((plan) => (
                  <div key={plan.id} className="border border-zinc-700 bg-zinc-800 p-6 rounded-lg hover:border-orange-600 transition-colors">
                    <div className="mb-4">
                      <h4 className="text-lg font-serif font-bold text-white mb-2">{plan.name}</h4>
                      <div className="text-2xl font-bold text-orange-500 mb-1">
                        ${plan.price ? (plan.price / 100).toFixed(2) : '0.00'}
                        <span className="text-sm text-zinc-400 font-normal">/month</span>
                      </div>
                    </div>

                    <ul className="space-y-2 text-sm text-zinc-400 mb-6">
                      <li>• Unlimited case management</li>
                      <li>• Document storage and sharing</li>
                      <li>• Priority customer support</li>
                      <li>• Automated billing</li>
                      {plan.monthly_limit && (
                        <li>• Up to {plan.monthly_limit} cases per month</li>
                      )}
                    </ul>

                    <button
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded uppercase text-sm tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      disabled={checkoutLoading === plan.id}
                      onClick={async () => {
                        try {
                          setCheckoutLoading(plan.id);
                          const response = await fetch('/api/operator/payments/checkout', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              priceId: plan.stripe_price_id,
                            }),
                          });

                          const data = await response.json();

                          if (data.success && data.url) {
                            // Store checkout intent in sessionStorage to detect return
                            sessionStorage.setItem('stripe_checkout_started', Date.now().toString());
                            // Redirect to Stripe checkout
                            window.location.href = data.url;
                          } else {
                            alert(`Error: ${data.error || 'Failed to create checkout session'}`);
                          }
                        } catch (error) {
                          console.error('Checkout error:', error);
                          alert('Failed to start checkout process. Please try again.');
                        } finally {
                          setCheckoutLoading(null);
                        }
                      }}
                    >
                      {checkoutLoading === plan.id ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Subscribe Now'
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Features Overview */}
          <div className="bg-zinc-900 border border-zinc-800 p-6">
            <h3 className="text-lg font-serif font-bold text-white uppercase tracking-tight mb-4">
              All Plans Include:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-500" size={16} />
                  <span className="text-zinc-300 text-sm">Unlimited case creation and management</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-500" size={16} />
                  <span className="text-zinc-300 text-sm">Secure document storage and sharing</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-500" size={16} />
                  <span className="text-zinc-300 text-sm">Real-time collaboration tools</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-500" size={16} />
                  <span className="text-zinc-300 text-sm">Priority customer support</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-500" size={16} />
                  <span className="text-zinc-300 text-sm">Automated billing and invoicing</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-500" size={16} />
                  <span className="text-zinc-300 text-sm">Usage analytics and reporting</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
