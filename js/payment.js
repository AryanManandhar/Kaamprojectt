let paymentBookingId = null;
let paymentAmount = null;

function openPaymentModal(bookingId, amount) {
  paymentBookingId = bookingId;
  paymentAmount = amount;
  document.getElementById('payment-amount-display').textContent = amount ? `Rs ${amount}` : 'Enter amount at checkout';
  document.getElementById('payment-overlay').classList.add('open');
}
function closePaymentModal(e) { if (e.target === document.getElementById('payment-overlay')) closePaymentModalDirect(); }
function closePaymentModalDirect() { document.getElementById('payment-overlay').classList.remove('open'); }

async function startPayment(provider) {
  const token = localStorage.getItem('kam_token');
  if (!token || !paymentBookingId) {
    toast('Please sign in first.');
    return;
  }

  let amount = paymentAmount;
  if (!amount) {
    amount = prompt('This job has no budget set. Enter the amount to pay (Rs):');
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast('Enter a valid amount.');
      return;
    }
  }

  try {
    const res = await fetch(`${window.API_BASE || 'http://localhost:4000'}/api/payments/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
      body: JSON.stringify({ booking_id: paymentBookingId, provider, amount: amount ? Number(amount) : undefined }),
    });
    const data = await res.json();

    if (!data.success) {
      toast(data.message || 'Could not start payment.');
      return;
    }

    if (data.provider === 'esewa') {
      // eSewa expects a real browser form POST, not a fetch redirect.
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = data.formAction;
      Object.entries(data.fields).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } else if (data.provider === 'khalti') {
      window.location.href = data.payment_url;
    }
  } catch (err) {
    console.error('Payment initiate error:', err);
    toast('Could not reach the server.');
  }
}

function payWithEsewa() { startPayment('esewa'); }
function payWithKhalti() { startPayment('khalti'); }

// After returning from eSewa/Khalti, server.js redirects back here with
// ?payment=success|failed. Show a toast, refresh the list, and clean the URL.
function handlePaymentReturn() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('payment')) return;

  if (params.get('payment') === 'success') {
    toast('Payment successful!');
  } else {
    toast('Payment was not completed.');
  }
  loadYouHired();

  const cleanUrl = window.location.origin + window.location.pathname;
  window.history.replaceState({}, document.title, cleanUrl);
}
document.addEventListener('DOMContentLoaded', handlePaymentReturn);

