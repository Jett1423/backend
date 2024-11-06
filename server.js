const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PAYMONGO_SECRET_KEY = "sk_test_sHTgy92wSWa3us8RUQhn5Gzw"; // Replace with your actual PayMongo secret key

// Create a Checkout Session (your existing code)
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
app.post("/webhook", (req, res) => {
  const event = req.body;

  // Add optional verification for PayMongo webhook signature here if available

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
