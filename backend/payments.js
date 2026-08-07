/**
 * payments.js
 * ----------------------------------------------------------------
 * eSewa (v2 signed-form flow) and Khalti (ePayment API) integration
 * for Kam. Both providers here point at their TEST/sandbox endpoints
 * by default so you can develop without a live merchant account.
 *
 * SETUP:
 *   Add these to kam-backend/.env:
 *
 *   # eSewa test credentials (these are eSewa's own published sandbox
 *   # values — safe to use for development, everyone uses the same ones).
 *   # Test payment page login: eSewaID 9806800001-9806800005, password
 *   # "Nepal@123", token "123456" — see eSewa's developer docs.
 *   ESEWA_PRODUCT_CODE=EPAYTEST
 *   ESEWA_SECRET_KEY=8gBm/:&EnhH.1/q
 *   ESEWA_FORM_URL=https://rc-epay.esewa.com.np/api/epay/main/v2/form
 *   ESEWA_STATUS_URL=https://rc.esewa.com.np/api/epay/transaction/status/
 *
 *   # Khalti test credentials — get your own test secret key free at
 *   # https://test-admin.khalti.com (Settings > Keys) after signing up.
 *   KHALTI_SECRET_KEY=your_test_secret_key
 *   KHALTI_BASE_URL=https://dev.khalti.com/api/v2
 *
 * When you're ready to go live, swap in your real merchant code/secret
 * key and switch the URLs to eSewa/Khalti's production endpoints.
 * ----------------------------------------------------------------
 */

require('dotenv').config();
const crypto = require('crypto');

// ============================ eSewa ============================

const ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || 'EPAYTEST';
const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';
const ESEWA_FORM_URL = process.env.ESEWA_FORM_URL || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
const ESEWA_STATUS_URL = process.env.ESEWA_STATUS_URL || 'https://rc.esewa.com.np/api/epay/transaction/status/';

function esewaSignature(message) {
  return crypto.createHmac('sha256', ESEWA_SECRET_KEY).update(message).digest('base64');
}

// Builds the auto-submit form fields eSewa expects. The frontend should
// render a <form> with these fields (as hidden inputs) and action=formAction,
// then submit it — that's what actually redirects the user to eSewa.
function buildEsewaForm({ amount, transactionUuid, successUrl, failureUrl }) {
  const totalAmount = Number(amount).toFixed(2);
  const signedFieldNames = 'total_amount,transaction_uuid,product_code';
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${ESEWA_PRODUCT_CODE}`;
  const signature = esewaSignature(message);

  return {
    formAction: ESEWA_FORM_URL,
    fields: {
      amount: totalAmount,
      tax_amount: '0',
      total_amount: totalAmount,
      transaction_uuid: transactionUuid,
      product_code: ESEWA_PRODUCT_CODE,
      product_service_charge: '0',
      product_delivery_charge: '0',
      success_url: successUrl,
      failure_url: failureUrl,
      signed_field_names: signedFieldNames,
      signature,
    },
  };
}

// eSewa's success redirect includes ?data=<base64 JSON>. Decode it and
// re-verify the signature ourselves — never trust it just because it's
// present in the query string.
function verifyEsewaCallback(base64Data) {
  if (!base64Data) return null;
  try {
    const decoded = Buffer.from(base64Data, 'base64').toString('utf-8');
    const payload = JSON.parse(decoded);

    const fieldNames = (payload.signed_field_names || '').split(',');
    const message = fieldNames.map((f) => `${f}=${payload[f]}`).join(',');
    const expectedSignature = esewaSignature(message);

    if (expectedSignature !== payload.signature) {
      console.error('eSewa signature mismatch — possible tampering.');
      return null;
    }
    return payload;
  } catch (err) {
    console.error('Failed to decode/verify eSewa callback:', err);
    return null;
  }
}

// Belt-and-suspenders: even after verifying the signature, ask eSewa
// directly whether the transaction actually completed.
async function checkEsewaStatus({ totalAmount, transactionUuid }) {
  const url = `${ESEWA_STATUS_URL}?product_code=${ESEWA_PRODUCT_CODE}&total_amount=${Number(totalAmount).toFixed(2)}&transaction_uuid=${transactionUuid}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`eSewa status check failed: ${res.status}`);
  return res.json(); // { status: 'COMPLETE' | 'PENDING' | ..., ref_id, ... }
}

// ============================ Khalti ============================

const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY;
const KHALTI_BASE_URL = process.env.KHALTI_BASE_URL || 'https://dev.khalti.com/api/v2';

function requireKhaltiKey() {
  if (!KHALTI_SECRET_KEY) {
    throw new Error(
      'KHALTI_SECRET_KEY is not set in .env — get a free test key at https://test-admin.khalti.com'
    );
  }
}

// Kicks off a Khalti payment. Returns { pidx, payment_url } — redirect
// the browser (or open a new tab) to payment_url.
async function initiateKhaltiPayment({
  amount,
  purchaseOrderId,
  purchaseOrderName,
  returnUrl,
  websiteUrl,
  customerName,
  customerEmail,
}) {
  requireKhaltiKey();

  const res = await fetch(`${KHALTI_BASE_URL}/epayment/initiate/`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${KHALTI_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      return_url: returnUrl,
      website_url: websiteUrl,
      amount: Math.round(Number(amount) * 100), // Khalti wants paisa, not rupees
      purchase_order_id: purchaseOrderId,
      purchase_order_name: purchaseOrderName,
      customer_info: {
        name: customerName || 'Kam User',
        email: customerEmail || undefined,
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Khalti initiate failed: ${JSON.stringify(data)}`);
  }
  return data; // { pidx, payment_url, ... }
}

// Confirms a payment's real status directly with Khalti — never trust
// the ?status= query param on the return_url redirect by itself.
async function lookupKhaltiPayment(pidx) {
  requireKhaltiKey();

  const res = await fetch(`${KHALTI_BASE_URL}/epayment/lookup/`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${KHALTI_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pidx }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Khalti lookup failed: ${JSON.stringify(data)}`);
  }
  return data; // { status: 'Completed' | 'Pending' | ..., transaction_id, ... }
}

module.exports = {
  buildEsewaForm,
  verifyEsewaCallback,
  checkEsewaStatus,
  initiateKhaltiPayment,
  lookupKhaltiPayment,
};
