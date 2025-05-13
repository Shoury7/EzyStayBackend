import { v2 as cloudinaryV2 } from "cloudinary";
import Listing from "../models/Listing.js";
import Review from "../models/Review.js";
import dotenv from "dotenv";
import User from "../models/User.js";
dotenv.config();

// Cloudinary config
cloudinaryV2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const createListing = async (req, res) => {
  try {
    const userId = req.user.id;

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

    const { title, description, price, location, country } = req.body;

    // 🌍 Fetch coordinates from Mapbox Geocoding API using fetch
    const mapboxToken = process.env.MAPBOX_TOKEN;
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        location
      )}.json?access_token=${mapboxToken}`
    );

    if (!response.ok) {
      return res
        .status(400)
        .json({ message: "Failed to fetch coordinates from Mapbox." });
    }

    const geoData = await response.json();

    if (!geoData.features.length) {
      return res.status(400).json({ message: "Invalid location input." });
    }

    const geometry = {
      type: "Point",
      coordinates: geoData.features[0].center, // [lng, lat]
    };

    const newListing = await Listing.create({
      title,
      description,
      price,
      location,
      country,
      images: uploadedImages,
      geometry,
      createdBy: userId,
    });

    await User.findByIdAndUpdate(userId, {
      $push: { listings: newListing._id },
    });

    res
      .status(201)
      .json({ message: "Listing created successfully", listing: newListing });
  } catch (error) {
    console.error("Error creating listing:", error);
    res.status(500).json({ message: "Internal server error" });
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
    // 🌍 Update geometry if location is provided
    if (updateData.location) {
      const mapboxToken = process.env.MAPBOX_TOKEN;
      const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        updateData.location
      )}.json?access_token=${mapboxToken}`;

      const geoRes = await fetch(mapboxUrl);
      const geoData = await geoRes.json();

      if (!geoData.features.length) {
        return res.status(400).json({ message: "Invalid location input." });
      }

      const geometry = {
        type: "Point",
        coordinates: geoData.features[0].center, // [lng, lat]
      };

      updateData.geometry = geometry;
    }

    const updatedListing = await Listing.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("createdBy", { email: 1, _id: 0 })
      .lean();

    if (!updatedListing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.status(200).json(updatedListing);
  } catch (error) {
    console.error("Error updating listing:", error);
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

//giving the listings owned by a admin
export const getListingsByUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).populate("listings");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user.listings);
  } catch (error) {
    console.error("Error fetching user listings:", error);
    res.status(500).json({ message: "Internal server error" }, user);
  }
};
