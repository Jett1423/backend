const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PAYMONGO_SECRET_KEY = "sk_test_sHTgy92wSWa3us8RUQhn5Gzw"; // Replace with your actual PayMongo secret key
const WEBHOOK_SECRET_KEY = "whsk_6Dq8XsTonCDU9yeeyL8eGqBV"; // Use the secret key provided in the webhook response

// Route to create a Checkout Session using the Payment Intent
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

// Webhook endpoint to receive payment status updates from PayMongo
const crypto = require("crypto");

app.post("/webhook", (req, res) => {
  const event = req.body;

  const receivedSignature = req.headers["paymongo-signature"];

  res.status(200).send("Webhook received");

  // Verify the signature if required by PayMongo (e.g., using HMAC)
  if (receivedSignature) {
    const computedSignature = crypto
      .createHmac("sha256", WEBHOOK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (computedSignature !== receivedSignature) {
      console.error("Invalid webhook signature");
      return res.status(400).send("Invalid signature");
    }
  } else {
    console.error("No webhook signature provided");
    return res.status(400).send("No signature");
  }

  // Handle different event types
  if (event.data && event.data.attributes) {
    const eventType = event.type;
    const paymentData = event.data.attributes;

    if (
      eventType === "payment.paid" ||
      eventType === "checkout_session.payment.paid"
    ) {
      console.log("Payment was successful:", paymentData);
      // Here, update your database or perform other actions to mark the payment as successful
    } else if (eventType === "payment.failed") {
      console.log("Payment failed:", paymentData);
      // Handle failed payment accordingly (e.g., notify user, log the event)
    } else {
      console.warn("Unhandled event type:", eventType);
    }
  } else {
    console.error("Invalid webhook payload:", event);
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
