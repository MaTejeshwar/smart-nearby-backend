require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const API_KEY = process.env.GOOGLE_API_KEY;

// Distance function
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

app.get("/", (req, res) => {
  res.send("Backend running ✅");
});

app.post("/places", async (req, res) => {
  const { lat, lng, mood } = req.body;

  if (!lat || !lng) {
    return res.status(400).json({ error: "Missing location" });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=3000&keyword=food&key=${API_KEY}`;

    const response = await axios.get(url);
    const places = response.data.results;

    const scoredPlaces = places.map((place) => {
      const placeLat = place.geometry.location.lat;
      const placeLng = place.geometry.location.lng;
      const distance = getDistance(lat, lng, placeLat, placeLng);

      const rating = place.rating || 0;
      const reviews = place.user_ratings_total || 0;
      const types = place.types || [];

      let moodScore = 0;

      if (mood === "chill" && (types.includes("cafe") || types.includes("restaurant"))) {
        moodScore = 1;
      }

      if (mood === "work" && (types.includes("cafe") || types.includes("restaurant"))) {
        moodScore = 1;
      }

      if (mood === "date" && types.includes("restaurant")) {
        moodScore = 1;
      }

      if (
        mood === "quick" &&
        (types.includes("meal_takeaway") ||
          types.includes("fast_food") ||
          types.includes("restaurant"))
      ) {
        moodScore = 1;
      }

      const score =
        rating * 0.4 +
        Math.log10(reviews + 1) * 0.3 -
        distance * 0.2 +
        moodScore * 0.3;

      let reason = [];

      if (rating >= 4.2) reason.push("Well rated ⭐");
      else if (rating >= 3.8) reason.push("Decent ratings 👍");

      if (reviews > 200) reason.push("Popular spot 🔥");
      else if (reviews > 50) reason.push("Known place 👀");

      if (mood === "chill" && (types.includes("cafe") || types.includes("restaurant"))) {
        reason.push("Nice place to relax 🌿");
      }

      if (mood === "work" && (types.includes("cafe") || types.includes("restaurant"))) {
        reason.push("Good for working 💻");
      }

      if (mood === "date" && types.includes("restaurant")) {
        reason.push("Good for dates ❤️");
      }

      if (
        mood === "quick" &&
        (types.includes("meal_takeaway") || types.includes("restaurant"))
      ) {
        reason.push("Quick food option ⚡");
      }

      return {
        name: place.name,
        vicinity: place.vicinity,
        rating,
        distance,
        score,
        reason: reason.length > 0
          ? reason.join(" • ")
          : "Recommended based on overall score",
        geometry: place.geometry, // still needed for maps link
      };
    });

    scoredPlaces.sort((a, b) => b.score - a.score);

    res.json(scoredPlaces);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to fetch places" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});