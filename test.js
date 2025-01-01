import * as cheerio from "cheerio";

const TESTURL =
  "https://www.joyclub.de/event/1562445.clubnacht_feat_giulia_siegel_ausverkauft_kolkwitz.html";

async function fetchTestEvent(url) {
  const eventResponse = await fetch(url);

  if (!eventResponse.ok) {
    return null;
  }

  const eventData = await eventResponse.text();
  const $ = cheerio.load(eventData);

  const eventType = $(".event_type > a").text();
  

}

fetchTestEvent(TESTURL);
