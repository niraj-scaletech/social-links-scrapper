import { Page } from "puppeteer-extra-plugin/dist/puppeteer";
import { apikey, sequence_id, showBrowser } from "./config";
import { browser, wait } from "@crawlora/browser";
import debug from "debug";

export default async function ({ searches }: { searches: string }) {
  const formedData = searches
    .trim()
    .split("\n")
    .map((v) => v.trim());

  for await (const search of formedData) {
    await browser(
      async ({ page, wait, output, debug }) => {
        const platform = getPlatform(search);
        debug(`Platform: ${platform}`);

        await page.goto(search, {
          waitUntil: ["networkidle2"],
          timeout: 60000,
        });
        debug(`Visiting ${platform}: ${search}`);
        await wait(2);

        let data;
        switch (platform) {
          case "Instagram":
            data = await scrapeInstagram(page, wait, debug);
            break;
          case "Facebook":
            data = await scrapeFacebook(page, wait, debug);
            break;
          case "Twitter":
            data = await scrapeTwitter(page, debug);
            break;
          default:
            debug(`Unsupported platform: ${search}`);
            data = { error: "Unsupported platform" };
        }
      },
      { showBrowser, apikey }
    );
  }
}

export function getPlatform(url: string) {
  if (url.includes("instagram.com")) return "Instagram";
  if (url.includes("facebook.com")) return "Facebook";
  if (url.includes("twitter.com")) return "Twitter";
  return "Unknown";
}

async function scrapeInstagram(page: Page, wait: any, debug: debug.Debugger) {
  const closeButton = await page.$(
    'div[role="dialog"] svg[aria-label="Close"]'
  );
  if (closeButton) {
    debug("Dialog detected in instagram");
    closeButton.click();
    await wait(1);
    debug("Dialog closed with the close button.");
  }

  return await page.evaluate(() => {
    const [posts, followers, following] = Array.from(
      document.querySelectorAll("li.xl565be .x5n08af")
    ).map((el) => el.textContent?.trim());
    return {
      posts,
      followers,
      following,
    };
  });
}

// Scraper function for Facebook
async function scrapeFacebook(page: Page, wait: any, debug: debug.Debugger) {
  const closeButton = await page.$('div[aria-label="Close"]');
  if (closeButton) {
    debug("Dialog detected in facebook");
    closeButton.click();
    await wait(1);
    debug("Dialog closed with the close button.");
  }

  return await page.evaluate(() => {
    const objElement = document.querySelector("div.xvrxa7q");

    const element = objElement?.querySelectorAll('a[role="link"]') || [];
    return {
      followers: element[1].textContent?.replace("followers", "").trim(),
      following: element[2].textContent?.replace("following", "").trim(),
    };
  });
}

async function scrapeTwitter(page: Page, debug: debug.Debugger) {
  return await page.evaluate(() => {
    const element = Array.from(document.querySelectorAll('a[role="link"]'));
    const postElement = Array.from(
      document.querySelectorAll("div.css-146c3p1")
    );

    const following = element
      .find((el) => el?.textContent?.includes("Following"))
      ?.textContent?.replace("Following", "")
      .trim();
    const followers = element
      .find((el) => el?.textContent?.includes("Followers"))
      ?.textContent?.replace("Followers", "")
      .trim();
    const posts = postElement
      .find((el) => el?.textContent?.includes("posts"))
      ?.textContent?.replace("posts", "")
      .trim();

    return {
      posts,
      following,
      followers,
    };
  });
}
