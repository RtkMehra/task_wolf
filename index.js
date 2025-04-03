/**
 * -----------------------------------------------------------------------------------
 * **Hacker News Tags Used for Scraping**
 * -----------------------------------------------------------------------------------
 * 1. **tr.athing** - Identifies each article row in the list.
 * 2. **.titleline > a** - Extracts the article title.
 * 3. **.age > a** - Extracts the article timestamp (linked to UNIX time).
 * 4. **.morelink** - The "More" button for loading additional articles.
 * -----------------------------------------------------------------------------------
 */


const { chromium } = require("playwright");

// Logger utility
const logger = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  success: (msg) => console.log(`[SUCCESS] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`)
};

/**
 * Validates and prints the first 100 articles on Hacker News/newest, sorted by time
 * @returns {Promise<void>}
 */
async function validateArticleSorting() {
  logger.info("Bot started: Validating Hacker News newest articles...");

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    logger.info("Navigating to Hacker News 'newest' page...");
    await page.goto("https://news.ycombinator.com/newest", { waitUntil: "networkidle" });

    const articles = [];

    while (articles.length < 100) {
      logger.info(`Extracting articles... Current count: ${articles.length}`);

      // Get all articles with timestamps
      const newArticles = await page.evaluate(() => {
        const results = [];
        const rows = document.querySelectorAll("tr.athing");

        for (const row of rows) {
          const id = row.getAttribute("id");
          const titleEl = row.querySelector(".titleline > a");
          const ageEl = document.querySelector(`#score_${id}`)
            ?.parentElement?.querySelector(".age > a");

          if (titleEl && ageEl) {
            const timestamp = parseInt(ageEl.href.match(/\d+/)?.[0]) * 1000; // Convert UNIX timestamp
            if (!isNaN(timestamp)) {
              results.push({
                title: titleEl.textContent.trim(),
                timestamp
              });
            }
          }
        }
        return results;
      });

      logger.info(`Extracted ${newArticles.length} new articles from page.`);

      articles.push(...newArticles);

      // If we still need more articles, click "More" and wait
      if (articles.length < 100) {
        logger.info("Clicking 'More' to load additional articles...");
        await Promise.all([
          page.click(".morelink"),
          page.waitForLoadState("networkidle")
        ]);
      }
    }

    // Sort articles by timestamp (newest first)
    const top100 = articles.slice(0, 100).sort((a, b) => b.timestamp - a.timestamp);

    logger.info("Sorting articles from newest to oldest...");

    logger.info("\nFinal sorted list of 100 articles (newest to oldest):");
    logger.info("----------------------------------------");

    // Print articles in order
    top100.forEach((article, index) => {
      const date = new Date(article.timestamp);
      console.log(`${index + 1}. [${date.toLocaleString()}] ${article.title}`);
    });

    logger.info("----------------------------------------");
    logger.success("Successfully validated and sorted 100 articles.");

    // Validate sorting
    for (let i = 1; i < top100.length; i++) {
      if (top100[i].timestamp > top100[i - 1].timestamp) {
        throw new Error(
          `Sorting error at position ${i}: ` +
          `Article '${top100[i].title}' is newer than '${top100[i - 1].title}'`
        );
      }
    }

  } catch (error) {
    logger.error(`Validation failed: ${error.message}`);
  } finally {
    logger.info("Closing browser...");
    await browser.close();
    logger.success("Bot execution completed.");
  }
}

// Run the function
validateArticleSorting();
