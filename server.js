const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PAYMONGO_SECRET_KEY = "sk_test_sHTgy92wSWa3us8RUQhn5Gzw"; // Replace with your actual PayMongo secret key
const WEBHOOK_SECRET_KEY = "whsk_6Dq8XsTonCDU9yeeyL8eGqBV"; // Use the secret key provided in the webhook response

// Route to create a Payment Intent
app.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount, description } = req.body;

    const response = await axios.post(
      "https://api.paymongo.com/v1/payment_intents",
      {
        data: {
          attributes: {
            amount, // Amount in centavos (e.g., 10000 = PHP 100.00)
            currency: "PHP",
            description,
            payment_method_allowed: ["gcash", "grab_pay", "paymaya"],
            capture_type: "automatic",
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
      "Error creating payment intent:",
      error.response ? error.response.data : error.message
    );
    res
      .status(500)
      .json({ error: error.response ? error.response.data : error.message });
  }
});

// Route to create a Checkout Session using the Payment Intent
app.post("/create-checkout-session", async (req, res) => {
  try {
    const {
      paymentIntentId,
      redirectSuccess,
      redirectFailed,
      customerEmail,
      description,
      lineItems, // Expecting lineItems array from the client request
    } = req.body;

    const response = await axios.post(
      "https://api.paymongo.com/v1/checkout_sessions",
      {
        data: {
          attributes: {
            payment_intent: paymentIntentId,
            currency: "PHP",
            redirect: {
              success: redirectSuccess || "myapp://payment-success",
              failed: redirectFailed || "myapp://payment-failed",
            },
            customer_email: customerEmail,
            description,
            payment_method_types: ["gcash", "grab_pay", "paymaya"],
            line_items: lineItems || [
              {
                name: description || "Default Item", // Example item name if not provided
                amount: amount, // Amount in centavos, e.g., 10000 for PHP 100.00
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
      "Error creating checkout session:",
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

  const receivedSignature = req.headers["paymongo-signature"]; // Assuming PayMongo provides this in headers

  if (receivedSignature && receivedSignature !== WEBHOOK_SECRET_KEY) {
    console.error("Invalid webhook signature");
    return res.status(400).send("Invalid signature");
  }

  if (event.data && event.data.attributes) {
    const eventType = event.type;
    const paymentData = event.data.attributes;

    if (
      eventType === "payment.paid" ||
      eventType === "checkout_session.payment.paid"
    ) {
      console.log("Payment was successful:", paymentData);
      // Add your database update logic here
    } else if (eventType === "payment.failed") {
      console.log("Payment failed:", paymentData);
      // Add your database update logic here
    } else {
      console.warn("Unhandled event type:", eventType);
    }
  } else {
    console.error("Invalid webhook payload:", event);
  }

  res.status(200).send("Webhook received");
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
