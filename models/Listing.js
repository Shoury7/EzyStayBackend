import mongoose from "mongoose";

const listingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  location: { type: String, required: true },
  country: { type: String, required: true },
  isAvailable: {
    type: Boolean,
    default: true, // Default to available
  },
  geometry: {
    type: {
      type: String,
      enum: ["Point"], // Only accept "Point"
      required: true,
      default: "Point",
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  images: [
    {
      url: String,
      public_id: String,
    },
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

const Listing = mongoose.model("Listing", listingSchema);
export default Listing;
