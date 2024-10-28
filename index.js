import * as cheerio from "cheerio";

const BASE_URL = (clubID) =>
  `https://www.joyclub.de/ext/widget/event/?v=1_1&user=${clubID}`;

import express from "express";
const app = express();
const PORT = process.env.PORT || 3000;

const CLUBS = {};

async function getClubEventsData(clubID) {
  const response = await fetch(BASE_URL(clubID));
  if (!response.ok) {
    return null;
  }
  const data = await response.text();
  return data;
}

function parseClubEventsData(data, clubID) {
  const $ = cheerio.load(data);
  const $liElements = $("ul > li");

  const events = $liElements
    .map((index, li) => {
      const link = $("a").attr("href");
      const dateText = $(li)
        .contents()
        .filter((_, element) => element.type === "text")
        .text()
        .trim();

      const dateArray = dateText.split(",")[1].trim().split(".").map(Number);
      const date = new Date(dateArray[2], dateArray[1] - 1, dateArray[0]);
      date.setHours(0, 0, 0, 0);

      const imagesWithSize = $("source").attr("srcset").split(",");
      const images = imagesWithSize.map((imageelement) => {
        imageelement = imageelement.trim();
        const [url, size] = imageelement.split(" ");

        const image = {
          url,
          size,
        };
        return image;
      });

      console.log(imagesWithSize);

      const title = $(li).find("h2").text().trim();

      const event = {
        id: clubID,
        events: [{ clubID, title, dateText, date, link, images }],
      };

      return event;
    })
    .get();

  return events;
}

app.get("/api/", (req, res) => {
  res.json({
    message: "API is up and running",
    info: "get events for specific ClubID /api/events/club/:clubID",
  });
});

app.get("/api/events/stored_clubs", (req, res) => {
  res.json({
    message: "Success",
    clubs: CLUBS,
  });
});

app.get("/api/events/club/:clubID", async (req, res) => {
  const expirationTime = Date.now() - 60 * 60 * 1000;

  const clubID = req.params.clubID;

  // CLUB EXISTS AND IS NOT EXPIRED
  if (CLUBS[clubID] && CLUBS[clubID].last_checked > expirationTime) {
    return res.json({
      message: "Success",
      info: "cached data - check last_checked",
      events: CLUBS[clubID].events,
      last_checked: CLUBS[clubID].last_checked,
    });
  }

  // CLUB EXISTS AND IS EXPIRED
  if (CLUBS[clubID] && CLUBS[clubID].last_checked <= expirationTime) {
    const clubEventsData = await getClubEventsData(clubID);

    if (!clubEventsData) {
      return res.json({
        message: "Success",
        info: "only old data available - check last_checked",
        events: CLUBS[clubID].events,
        last_checked: CLUBS[clubID].last_checked,
      });
    }

    const clubEvents = parseClubEventsData(clubEventsData, clubID);
    CLUBS[clubID] = { events: clubEvents, last_checked: Date.now() };

    return res.json({
      message: "Success",
      info: "fresh data - check last_checked",
      events: clubEvents,
      last_checked: Date.now(),
    });
  }

  // HAVENT FETCHED CLUB ALREADY
  if (!CLUBS[clubID]) {
    const clubEventsData = await getClubEventsData(clubID);

    if (!clubEventsData) {
      return res.json({
        message: "No data for club available",
      });
    } else {
      const clubEvents = parseClubEventsData(clubEventsData, clubID);

      CLUBS[clubID] = { events: clubEvents, last_checked: Date.now() };

      return res.json({
        message: "Success",
        info: "fresh data - check last_checked",
        events: clubEvents,
        last_checked: Date.now(),
      });
    }
  }

  return res.json({
    message: "SOMETHING WENT WRONG",
  });
});

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
