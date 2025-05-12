import { v2 as cloudinaryV2 } from "cloudinary";
import Listing from "../models/Listing.js";
import Review from "../models/Review.js";
import dotenv from "dotenv";
dotenv.config();

// Cloudinary config
cloudinaryV2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const createListing = async (req, res) => {
  try {
    const uploadPromises = req.files.map((file) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinaryV2.uploader.upload_stream(
          { folder: "ezystay-listings" },
          (error, result) => {
            if (error) return reject(error);
            resolve({
              url: result.secure_url,
              public_id: result.public_id,
            });
          }
        );
        stream.end(file.buffer);
      });
    });

    const uploadedImages = await Promise.all(uploadPromises);

    const newListing = new Listing({
      title: req.body.title,
      description: req.body.description,
      price: req.body.price,
      location: req.body.location,
      country: req.body.country,
      images: uploadedImages,
      createdBy: req.user.id,
    });

    await newListing.save();
    res.status(201).json(newListing);
  } catch (error) {
    console.error("Create Listing Error:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};

export const getAllListings = async (req, res) => {
  try {
    const listings = await Listing.find({})
      .select("-__v") // optional: exclude version key
      .populate("createdBy", { email: 1, _id: 0 })
      .lean(); // returns plain JavaScript objects

    res.status(200).json(listings);
  } catch (error) {
    res.status(500).json({ message: "Error fetching listings", error });
  }
};

export const getListingById = async (req, res) => {
  const { id } = req.params;

  try {
    const listing = await Listing.findById(id)
      .select("-__v")
      .populate("createdBy", { email: 1, _id: 0 })
      .lean();

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.status(200).json(listing);
  } catch (error) {
    res.status(500).json({ message: "Error fetching listing", error });
  }
};

export const updateListingById = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const updatedListing = await Listing.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("createdBy", { email: 1, _id: 0 }) // ✅ only email, no _id
      .lean();

    if (!updatedListing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.status(200).json(updatedListing);
  } catch (error) {
    res.status(500).json({ message: "Error updating listing", error });
  }
};

export const deleteListingById = async (req, res) => {
  const { id } = req.params;
  console.log(id);

  try {
    const deletedListing = await Listing.findByIdAndDelete(id);

    if (!deletedListing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.status(200).json({ message: "Listing deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting listing", error });
  }
};

export const addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const listingId = req.params.id;
    const userId = req.user.id;

    // 1. Check if listing exists
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // 2. Check if user has already reviewed
    const existingReview = await Review.findOne({
      listing: listingId,
      user: userId,
    });

    let review;
    if (existingReview) {
      // Update existing review
      existingReview.rating = rating;
      existingReview.comment = comment;
      review = await existingReview.save();
    } else {
      // Create new review
      review = new Review({
        listing: listingId,
        user: userId,
        rating,
        comment,
      });
      await review.save();
    }

    res.status(201).json({ message: "Review saved successfully", review });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ listing: req.params.id })
      .populate("user", "name") // show username only
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: "Error fetching reviews", err });
  }
};

export const updateReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const listingId = req.params.id;
    const userId = req.user.id;

    // Check if review exists
    const review = await Review.findOne({ listing: listingId, user: userId });

    if (!review) {
      return res
        .status(404)
        .json({ message: "Review not found for this listing by the user" });
    }

    // Update fields
    review.rating = rating ?? review.rating;
    review.comment = comment ?? review.comment;

    await review.save();

    res.status(200).json({ message: "Review updated successfully", review });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
export const deleteReview = async (req, res) => {
  try {
    const listingId = req.params.id;
    const userId = req.user.id;
    const review = await Review.findOne({ listing: listingId, user: userId });

    if (!review) {
      return res
        .status(404)
        .json({ message: "Review not found or not authorized to delete" });
    }
    await review.deleteOne();

    res.status(200).json({ message: "Review deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
