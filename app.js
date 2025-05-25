const paypalButtons = window.paypal.Buttons({
    style: {
        shape: 'rect',
        layout: 'vertical',
        color: 'gold',
        label: 'subscribe'
    },
    async createVaultSetupToken() {
        try {
            const plan = document.querySelector('input[name="plan"]:checked').value;
            const isMonthly = plan === 'monthly';
            const response = await fetch('http://monday-modules.gl.at.ply.gg:62761/api/vault', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    payment_source: {
                        paypal: {
                            usage_type: 'MERCHANT',
                            usage_pattern: 'SUBSCRIPTION_PREPAID',
                            billing_plan: {
                                name: isMonthly ? 'FaithChat AI Monthly Subscription' : 'FaithChat AI Yearly Subscription',
                                billing_cycles: [
                                    {
                                        tenure_type: 'REGULAR',
                                        pricing_scheme: {
                                            pricing_model: 'FIXED',
                                            price: {
                                                value: isMonthly ? '19.99' : '191.88',
                                                currency_code: 'USD',
                                            },
                                        },
                                        frequency: {
                                            interval_unit: isMonthly ? 'MONTH' : 'YEAR',
                                            interval_count: 1,
                                        },
                                        total_cycles: 0,
                                    },
                                ],
                                product: {
                                    description: 'AI-powered Bible study tool',
                                    quantity: '1',
                                },
                            },
                            experience_context: {
                                return_url: 'http://monday-modules.gl.at.ply.gg:62761/success.html',
                                cancel_url: 'http://monday-modules.gl.at.ply.gg:62761/cancel.html',
                            },
                        },
                    },
                }),
            });

            const setupTokenData = await response.json();
            if (setupTokenData.id) {
                return setupTokenData.id;
            }
            const errorDetail = setupTokenData?.details?.[0];
            const errorMessage = errorDetail
                ? `${errorDetail.issue} ${errorDetail.description} (${setupTokenData.debug_id})`
                : JSON.stringify(setupTokenData);
            throw new Error(errorMessage);
        } catch (error) {
            console.error('Setup Token Error:', error);
            alert(`Could not create setup token: ${error.message}`);
        }
    },
    async onApprove(data, actions) {
        try {
            const plan = document.querySelector('input[name="plan"]:checked').value;
            const response = await fetch('http://monday-modules.gl.at.ply.gg:62761/api/vault/payment-tokens', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    payment_source: {
                        token: {
                            id: data.vaultSetupToken,
                            type: 'SETUP_TOKEN',
                        },
                    },
                }),
            });

            const paymentTokenData = await response.json();
            if (paymentTokenData.id) {
                // Store payment token in backend
                await fetch('http://monday-modules.gl.at.ply.gg:62761/api/subscriptions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        paymentTokenId: paymentTokenData.id,
                        plan: plan,
                    }),
                });
                alert('Subscription setup successfully!');
                window.location.href = 'http://monday-modules.gl.at.ply.gg:62761/success.html';
            } else {
                const errorDetail = paymentTokenData?.details?.[0];
                throw new Error(
                    errorDetail
                        ? `${errorDetail.description} (${paymentTokenData.debug_id})`
                        : JSON.stringify(paymentTokenData)
                );
            }
        } catch (error) {
            console.error('Payment Token Error:', error);
            alert(`Failed to create payment token: ${error.message}`);
        }
    },
    onError: function(err) {
        console.error('PayPal Error:', err);
        alert('An error occurred with PayPal. Please try again.');
    },
});

paypalButtons.render('#paypal-button-container');

// Toggle active plan
document.querySelectorAll('input[name="plan"]').forEach(option => {
    option.addEventListener('change', () => {
        document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('active'));
        option.parentElement.classList.add('active');
    });
});

// Show PayPal button on form submission
document.getElementById('payment-form').addEventListener('submit', (e) => {
    e.preventDefault();
    document.getElementById('paypal-button-container').style.display = 'block';
});
