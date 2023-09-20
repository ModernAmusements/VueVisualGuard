const fs = require('fs');
const { test } = require('@playwright/test');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');
const sharp = require('sharp');

const input = JSON.parse(fs.readFileSync('input.json'));


async function compareScreenshots(screenshot1Path, screenshot2Path, diffPath) {
  const screenshot1Buffer = await fs.promises.readFile(screenshot1Path);
  const screenshot2Buffer = await fs.promises.readFile(screenshot2Path);

  let screenshot1 = PNG.sync.read(screenshot1Buffer);
  let screenshot2 = PNG.sync.read(screenshot2Buffer);

  // Resize screenshots to have the same height and width based on the largest dimension
  const maxWidth = Math.max(screenshot1.width, screenshot2.width);
  const maxHeight = Math.max(screenshot1.height, screenshot2.height);

  const resizedScreenshot1Buffer = await sharp(screenshot1Buffer)
    .resize(maxWidth, maxHeight)
    .png()
    .toBuffer();
  const resizedScreenshot2Buffer = await sharp(screenshot2Buffer)
    .resize(maxWidth, maxHeight)
    .png()
    .toBuffer();

  screenshot1 = PNG.sync.read(resizedScreenshot1Buffer);
  screenshot2 = PNG.sync.read(resizedScreenshot2Buffer);

  const diff = new PNG({ width: maxWidth, height: maxHeight });

  console.log(`screenshot1 dimensions: ${screenshot1.width}x${screenshot1.height}`);
  console.log(`screenshot2 dimensions: ${screenshot2.width}x${screenshot2.height}`);

  const numDiffPixels = pixelmatch(screenshot1.data, screenshot2.data, diff.data, maxWidth, maxHeight, { threshold: 0.1 });

  await fs.promises.writeFile(diffPath, PNG.sync.write(diff));

  return numDiffPixels;
}

test.describe('compare-domains', () => {
  let testIndex = 0;
  for (const { url1, url2, subdomains } of input) {
    for (const subsite of subdomains) {
      testIndex++;
      test(`[${url1}${subsite} vs ${url2}${subsite}] - Test ${testIndex}`, async ({ page }) => {
        const domainName1 = new URL(url1).hostname.replace('www.', '');
        const domainName2 = new URL(url2).hostname.replace('www.', '');
        const comparisonName = `${domainName1}_vs_${domainName2}`;

        fs.mkdirSync(`test-results/${comparisonName}/screenshots`, { recursive: true });
        fs.mkdirSync(`test-results/${comparisonName}/diffs`, { recursive: true });

        // Capture the first website screenshot
        await page.goto(`${url1}${subsite}`);
        await page.screenshot({ path: `test-results/${comparisonName}/screenshots/${domainName1}-${subsite.replace(/\//g, '')}.png`, fullPage: true });

        // Capture the second website screenshot
        await page.goto(`${url2}${subsite}`);
        await page.screenshot({ path: `test-results/${comparisonName}/screenshots/${domainName2}-${subsite.replace(/\//g, '')}.png`, fullPage: true });

        const numDiffPixels = await compareScreenshots(
          `test-results/${comparisonName}/screenshots/${domainName1}-${subsite.replace(/\//g, '')}.png`,
          `test-results/${comparisonName}/screenshots/${domainName2}-${subsite.replace(/\//g, '')}.png`,
          `test-results/${comparisonName}/diffs/diff-${subsite.replace(/\//g, '')}.png`
        );
        if (numDiffPixels > 0) {
          console.log(`[${url1}${subsite} vs ${url2}${subsite}] Screenshots differ by ${numDiffPixels} pixels. Diff screenshot saved to test-results/${comparisonName}/diffs/diff-${subsite.replace(/\//g, '')}.png.`);
        } else {
          console.log(`[${url1}${subsite} vs ${url2}${subsite}] Screenshots are identical.`);
        }
      });
    }
  }
});