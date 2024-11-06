const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PAYMONGO_SECRET_KEY = "sk_test_sHTgy92wSWa3us8RUQhn5Gzw"; // Replace with your actual PayMongo secret key
const WEBHOOK_SECRET_KEY = "whsk_6Dq8XsTonCDU9yeeyL8eGqBV"; // Use the secret key provided in the webhook response

// Route to create a new webhook
app.post("/create-webhook", async (req, res) => {
  try {
    const response = await axios.post(
      "https://api.paymongo.com/v1/webhooks",
      {
        data: {
          id: "hook_7WkQzyC21qh3ABP7R8o28fsp",
          type: "webhook",
          attributes: {
            events: [
              "payment.paid",
              "payment.failed",
              "checkout_session.payment.paid",
            ],
            livemode: false,
            secret_key: "whsk_6Dq8XsTonCDU9yeeyL8eGqBV",
            status: "enabled",
            url: "https://backend-mo9h.onrender.com",
            created_at: 1730888741,
            updated_at: 1730888741,
          },
        },
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            PAYMONGO_SECRET_KEY + ":"
          ).toString("base64")}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Webhook created:", response.data);
    res.json(response.data); // Includes the webhook ID and secret key for verification
  } catch (error) {
    console.error(
      "Error creating webhook:",
      error.response ? error.response.data : error.message
    );
    res
      .status(500)
      .json({ error: error.response ? error.response.data : error.message });
  }
});

// Webhook endpoint to receive payment status updates from PayMongo
app.post("/webhook", (req, res) => {
  const event = req.body;

  // Optional: Verify the webhook signature using the provided WEBHOOK_SECRET_KEY
  const receivedSignature = req.headers["paymongo-signature"]; // Assuming PayMongo provides this in headers

  if (receivedSignature && receivedSignature !== WEBHOOK_SECRET_KEY) {
    console.error("Invalid webhook signature");
    return res.status(400).send("Invalid signature");
  }

  // Handle different types of events
  if (event.data && event.data.attributes) {
    const eventType = event.type;
    const paymentData = event.data.attributes;

    if (
      eventType === "payment.paid" ||
      eventType === "checkout_session.payment.paid"
    ) {
      // Update payment status in your database as "successful"
      console.log("Payment was successful:", paymentData);
      // Add your database update logic here (e.g., saving to Firestore)
    } else if (eventType === "payment.failed") {
      // Update payment status in your database as "failed"
      console.log("Payment failed:", paymentData);
      // Add your database update logic here
    } else {
      console.warn("Unhandled event type:", eventType);
    }
  } else {
    console.error("Invalid webhook payload:", event);
  }

  // Send a 200 response back to PayMongo to acknowledge receipt of the webhook
  res.status(200).send("Webhook received");
});

// Route to create a checkout session
app.post("/create-checkout-session", async (req, res) => {
  try {
    const {
      amount,
      description,
      redirectSuccess,
      redirectFailed,
      customerEmail,
    } = req.body;

    const response = await axios.post(
      "https://api.paymongo.com/v1/checkout_sessions",
      {
        data: {
          attributes: {
            amount, // Amount in centavos (e.g., 10000 = PHP 100.00)
            currency: "PHP",
            description,
            redirect: {
              success: redirectSuccess || "myapp://payment-success",
              failed: redirectFailed || "myapp://payment-failed",
            },
            send_email_receipt: true, // Enable email receipt
            customer_email: customerEmail, // Customer's email for receipt
            show_description: true,
            payment_method_types: ["gcash", "grab_pay", "paymaya"], // Payment methods
            line_items: [
              {
                name: description || "Default Item", // Description or default item name
                amount: amount,
                currency: "PHP",
                quantity: 1, // Adjust quantity as needed
              },
            ],
          },
        },
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            PAYMONGO_SECRET_KEY + ":"
          ).toString("base64")}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
    res
      .status(500)
      .json({ error: error.response ? error.response.data : error.message });
  }
});

// Route to check the payment status by Payment Intent ID
app.get("/check-payment-status/:paymentIntentId", async (req, res) => {
  try {
    const paymentIntentId = req.params.paymentIntentId;
    const response = await axios.get(
      `https://api.paymongo.com/v1/payment_intents/${paymentIntentId}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            PAYMONGO_SECRET_KEY + ":"
          ).toString("base64")}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Check if payment was successful
    const status = response.data.data.attributes.status;
    res.json({ status });
  } catch (error) {
    console.error("Error checking payment status:", error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
