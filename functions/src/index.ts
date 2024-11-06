import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Request, Response } from "express";

admin.initializeApp();

// Initialize Firestore (or Realtime Database if you prefer)
const db = admin.firestore();

// Cloud Function to handle PayMongo webhook
exports.paymongoWebhook = functions.https.onRequest(
  async (req: Request, res: Response): Promise<void> => {
    const event = req.body;

    try {
      if (!event || !event.type || !event.data) {
        console.error("Invalid webhook event format:", event);
        res.status(400).send("Invalid event format");
        return; // Ensure that the function returns here
      }

      const paymentData = event.data;

      // Log the entire event for debugging purposes
      console.log("Received event:", JSON.stringify(event, null, 2));

      if (event.type === "payment.success") {
        // Save payment success status to Firestore
        await db.collection("payments").doc(paymentData.id).set({
          status: "success",
          amount: paymentData.attributes.amount,
          currency: paymentData.attributes.currency,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log("Payment success recorded for payment ID:", paymentData.id);
        res.status(200).send("Payment success recorded");
      } else if (event.type === "payment.failed") {
        // Save payment failure status to Firestore
        await db.collection("payments").doc(paymentData.id).set({
          status: "failed",
          amount: paymentData.attributes.amount,
          currency: paymentData.attributes.currency,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log("Payment failure recorded for payment ID:", paymentData.id);
        res.status(200).send("Payment failure recorded");
      } else {
        console.warn("Unhandled event type:", event.type);
        res.status(400).send("Unhandled event type");
      }
    } catch (error) {
      console.error("Error processing webhook:", error);
      res.status(500).send("Error processing webhook");
    }
  }
);
