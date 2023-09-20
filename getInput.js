const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeLinks(url) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const links = [];
    $('a').each((index, element) => {
      const link = $(element).attr('href');
      if (link && link.startsWith('/')) {
        links.push(link);
      }
    });

    return links;
  } catch (error) {
    console.error(`Error scraping links from ${url}:`, error.message);
    return [];
  }
}

const websites = [
  'https://reqfy.com/',

];

const stageUrlPrefix = 'https://aueg-netzwerk:1977@preprod.';

(async () => {
  const input = [];

  for (const website of websites) {
    const subdomains = await scrapeLinks(website);
    const stageDomain = stageUrlPrefix + website.slice(8);

    input.push({
      url1: website,
      url2: stageDomain,
      subdomains: subdomains,
    });
  }

  fs.writeFileSync('input.json', JSON.stringify(input));
})();