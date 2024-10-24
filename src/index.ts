import { Page } from "puppeteer-extra-plugin/dist/puppeteer";
import { apikey, sequence_id, showBrowser } from "./config";
import { browser } from "@crawlora/browser";
import debug from "debug";

export default async function ({
  searches,
}: {
  searches: string;
}) {

  const formedData = searches.trim().split("\n").map(v => v.trim())

  await browser(async ({ page, wait, output, debug }) => {

    for await (const search of formedData) {
      const platform = getPlatform(search);

      await page.goto(search, { waitUntil: ["networkidle2"] });
      debug(`Visiting ${platform}: ${search}`);
      await wait(2);

      let data;
      switch (platform) {
        case "Instagram":
          data = await scrapeInstagram(page, debug);
          console.log("🚀 ~ forawait ~ data:", data);
          break;
        case "Facebook":
          data = await scrapeFacebook(page);
          await wait(20000)
          break;
        case "Twitter":
          data = await scrapeTwitter(page);
          break;
        default:
          debug(`Unsupported platform: ${search}`);
          data = { error: "Unsupported platform" };
      }
    }
  }, { showBrowser, apikey })

}

export function getPlatform(url: string) {
  if (url.includes("instagram.com")) return "Instagram";
  if (url.includes("facebook.com")) return "Facebook";
  if (url.includes("twitter.com")) return "Twitter";
  return "Unknown";
}

async function scrapeInstagram(page: Page, debug: debug.Debugger) {
  const closeButton = await page.$('div[role="dialog"] svg[aria-label="Close"]');
  if (closeButton) {
    debug('Dialog detected in instagram');
    closeButton.click();
    debug('Dialog closed with the close button.');
  }

  return await page.evaluate(() => {
    const [posts, followers, following] = Array.from(document.querySelectorAll("li.xl565be .x5n08af")).map(el => el.textContent?.trim())
    return {
      posts,
      followers,
      following
    }
  });


}

// Scraper function for Facebook
async function scrapeFacebook(page: Page) {
  const closeButton = await page.$('div[aria-label="Close"]');
  if (closeButton) {
    debug('Dialog detected in facebook');
    closeButton.click();
    debug('Dialog closed with the close button.');
  }

  return await page.evaluate(() => ({
  }));
}

async function scrapeTwitter(page: Page) {
  return await page.evaluate(() => ({
  }));
}
