import User from "../models/User.js";
import Listing from "../models/Listing.js";
import Order from "../models/Order.js";
export const getAdminSummary = async (req, res) => {
  try {
    const adminId = req.user.id;

    // Get listings owned by this admin
    const adminListings = await Listing.find({ createdBy: adminId });
    const totalListings = adminListings.length;

    const listingIds = adminListings.map((listing) => listing._id);

    // Get all confirmed orders related to those listings
    const orders = await Order.find({
      listing: { $in: listingIds },
      status: "confirmed",
    });

    const totalBookings = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.amount / 100, 0);

    // Get current week's daily revenue (Sunday to Saturday)
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const dailyRevenue = Array(7).fill(0); // 0 - Sunday, 6 - Saturday

    orders.forEach((order) => {
      const date = new Date(order.createdAt);
      if (date >= startOfWeek) {
        const dayIndex = date.getDay(); // 0 = Sunday, 6 = Saturday
        dailyRevenue[dayIndex] += order.amount / 100;
      }
    });

    res.status(200).json({
      totalListings,
      totalBookings,
      totalRevenue,
      weeklyRevenue: dailyRevenue, // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
    });
  } catch (err) {
    console.error("Summary error:", err);
    res.status(500).json({ message: "Failed to fetch summary" });
  }
};
