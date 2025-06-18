import razorpay from "../config/razorpay.js";
import crypto from "crypto";
import nodemailer from "nodemailer";
import Listing from "../models/Listing.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
export const createOrder = async (req, res) => {
  const { amount, currency } = req.body;
  const options = {
    amount: amount * 100, // in paise
    currency,
    receipt: "order_rcptid_11",
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating order" });
  }
};

export const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    email,
    listing, // listing ID
    amount,
  } = req.body;

  console.log("data from payment :- \n", req.body);

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    // Step 1: Update listing as unavailable
    const updatedListing = await Listing.findByIdAndUpdate(
      listing,
      { isAvailable: false },
      { new: true }
    );

    // Step 2: Get user who made the booking
    const user = await User.findOne({ email });

    // Step 3: Create and save the order
    const newOrder = new Order({
      user: user._id,
      listing,
      amount,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      status: "confirmed",
    });

    await newOrder.save();

    // Step 4: Send email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"EzyStay Payments" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "✅ Payment Confirmation – Thank You for Choosing EzyStay!",
      text: `Dear Customer,

We’re excited to confirm that your payment has been successfully received!

🧾 Payment ID: ${razorpay_payment_id}

Thank you for choosing EzyStay. We’re thrilled to have you with us and look forward to providing you with a seamless experience.

If you have any questions or need support, feel free to reach out at support@ezystay.com.

Warm regards  
Team EzyStay  
www.ezystay.com`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("Confirmation email sent to", email);
      res.json({
        success: true,
        message: "Payment verified, order saved and email sent",
      });
    } catch (error) {
      console.error("Email sending failed:", error);
      res.json({
        success: true,
        message: "Payment verified, order saved but email sending failed",
      });
    }
  } else {
    res
      .status(400)
      .json({ success: false, message: "Payment verification failed" });
  }
};
