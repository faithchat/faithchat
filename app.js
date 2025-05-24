const planIds = {
    monthly: 'P-MONTHLY-PLAN-ID', // Replace with actual PayPal plan ID
    yearly: 'P-YEARLY-PLAN-ID'   // Replace with actual PayPal plan ID
};

paypal.Buttons({
    style: {
        shape: 'rect',
        color: 'gold',
        layout: 'vertical',
        label: 'subscribe'
    },
    createSubscription: function(data, actions) {
        const plan = document.querySelector('input[name="plan"]:checked').value;
        return actions.subscription.create({
            plan_id: planIds[plan],
            application_context: {
                return_url: 'http://monday-modules.gl.at.ply.gg:62761/success.html',
                cancel_url: 'http://monday-modules.gl.at.ply.gg:62761/cancel.html'
            }
        });
    },
    onApprove: function(data, actions) {
        fetch('http://monday-modules.gl.at.ply.gg:62761/api/subscriptions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subscriptionId: data.subscriptionID,
                plan: document.querySelector('input[name="plan"]:checked').value
            })
        })
        .then(response => response.json())
        .then(data => {
            alert('Subscription created successfully!');
            window.location.href = 'http://monday-modules.gl.at.ply.gg:62761/success.html';
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to create subscription. Please try again.');
        });
    },
    onError: function(err) {
        console.error('PayPal Error:', err);
        alert('An error occurred with PayPal. Please try again.');
    }
}).render('#paypal-button-container');

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
