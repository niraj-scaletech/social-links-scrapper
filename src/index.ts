import { Page } from "puppeteer-extra-plugin/dist/puppeteer";
import { apikey, sequence_id, showBrowser } from "./config";
import { browser, wait } from "@crawlora/browser";
import debug from "debug";
type NonNegativeInteger<T extends number> = number extends T ? never : `${T}` extends `-${string}` | `${string}.${string}` ? never : T;

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

        try {
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
              data = {
                posts: "N/A",
                followers: "N/A",
                following: "N/A",
              };
          }

          await output.create({
            sequence_id,
            sequence_output: {
              Posts: data.posts,
              Followers: data.followers,
              Following: data.following,
              Platform: platform,
              ProfileUrl: search
            },
          });
        } catch (error) {
          const e = error as Error;
          debug(`Error scraping ${platform}:`, e.message);
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

async function scrapeInstagram(page: Page, wait: <N extends number>(sec: NonNegativeInteger<N>) => Promise<void>, debug: debug.Debugger) {
  try {
    const closeButton = await page.$('div[role="dialog"] svg[aria-label="Close"]');
    if (closeButton) {
      debug("Instagram dialog detected");
      await closeButton.click();
      await wait(1);
      debug("Instagram dialog closed.");
    }

    return await page.evaluate(() => {
      const [posts, followers, following] = Array.from(
        document.querySelectorAll("li.xl565be .x5n08af")
      ).map((el) => el.textContent?.trim());

      return {
        posts: posts || "N/A",
        followers: followers || "N/A",
        following: following || "N/A",
      };
    });
  } catch (error) {
    const e = error as Error;
    debug("Instagram scraping error:", e.message);
    return {
      posts: "N/A",
      followers: "N/A",
      following: "N/A",
    };
  }
}

async function scrapeFacebook(page: Page, wait: <N extends number>(sec: NonNegativeInteger<N>) => Promise<void>, debug: debug.Debugger) {
  try {
    const closeButton = await page.$('div[aria-label="Close"]');
    if (closeButton) {
      debug("Facebook dialog detected");
      await closeButton.click();
      await wait(1);
      debug("Facebook dialog closed.");
    }

    return await page.evaluate(() => {
      const objElement = document.querySelector("div.xvrxa7q");
      const elements = objElement?.querySelectorAll('a[role="link"]') || [];

      return {
        posts: "N/A",
        followers: elements[1]?.textContent?.replace("followers", "").trim() || "N/A",
        following: elements[2]?.textContent?.replace("following", "").trim() || "N/A",
      };
    });
  } catch (error) {
    const e = error as Error;
    debug("Facebook scraping error:", e.message);
    return {
      posts: "N/A",
      followers: "N/A",
      following: "N/A",
    };
  }
}

async function scrapeTwitter(page: Page, debug: debug.Debugger) {
  try {
    return await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('a[role="link"]'));
      const postElement = Array.from(document.querySelectorAll("div.css-146c3p1"));

      const following = elements
        .find((el) => el?.textContent?.includes("Following"))
        ?.textContent?.replace("Following", "").trim() || "N/A";
      const followers = elements
        .find((el) => el?.textContent?.includes("Followers"))
        ?.textContent?.replace("Followers", "").trim() || "N/A";
      const posts = postElement
        .find((el) => el?.textContent?.includes("posts"))
        ?.textContent?.replace("posts", "").trim() || "N/A";

      return {
        posts,
        following,
        followers,
      };
    });
  } catch (error) {
    const e = error as Error;
    debug("Twitter scraping error:", e.message);
    return {
      posts: "N/A",
      followers: "N/A",
      following: "N/A",
    };
  }
}
