import express from "express";
import {
  createListing,
  deleteListingById,
  getAllListings,
  getListingById,
  updateListingById,
  addReview,
  getAllReviews,
  updateReview,
  deleteReview,
} from "../controllers/listingController.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorizeRoles } from "../middlewares/authorize.js";

import multer from "multer";
const storage = multer.memoryStorage(); // In-memory buffer for Cloudinary
const upload = multer({ storage: storage });

const router = express.Router();

// route for admins to create listings (can add authorizeRoles('admin') if needed)
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  upload.array("images", 5),
  createListing
);

//get all listings route
router.get("/", getAllListings);

//get listing by id
router.get("/:id", authenticate, getListingById);

//update listing by id
router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  upload.array("images", 5),
  updateListingById
);

//delete listing by id
router.delete("/:id", authenticate, authorizeRoles("admin"), deleteListingById);

//add review for the listings
router.post("/:id/reviews", authenticate, addReview);
//get all reviews for the listing
router.get("/:id/reviews", authenticate, getAllReviews);
//update method for the review
router.put("/:id/reviews", authenticate, updateReview);
//delete review from the user
router.delete("/:id/reviews", authenticate, deleteReview);
export default router;
