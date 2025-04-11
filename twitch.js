const puppeteer = require('puppeteer');
const fs = require('fs');

var consentToggle = true
var acceptToggle = true
async function main() {
    console.log('\x1b[36m%s\x1b[0m', 'Ninja - Twitch Viewer Bot');
    console.log(`
\x1b[32m░█▄░█░█░█▄░█░░▒█▒▄▀▄
        ░█▒▀█░█░█▒▀█░▀▄█░█▀█\x1b[0m`);

    const proxyServers = {
        1: 'https://www.blockaway.net',
        2: 'https://www.croxyproxy.com',
        3: 'https://www.croxyproxy.rocks',
        4: 'https://www.croxy.network',
        5: 'https://www.croxy.org',
        6: 'https://www.youtubeunblocked.live',
        7: 'https://www.croxyproxy.net',
        9: 'https://plainproxies.com/resources/free-web-proxy',
        10:'https://proxyium.com/',
    };

    const args = process.argv.slice(2);
    const proxy = args[0];
    const streamer = args[1];
    const viewersNo = args[2];
    const proxyChoice = proxy; // Default to server 1 if not provided in env
    const twitchUsername = streamer; // Default if not provided in env
    const proxyCount = viewersNo; // Default if not provided in env
    const proxyUrl = proxyServers[Number(proxyChoice)];

    console.clear();
    console.log('\x1b[36m%s\x1b[0m', 'Ninja - Twitch Viewer Bot');
    console.log(`
\x1b[32m░█▄░█░█░█▄░█░░▒█▒▄▀▄
        ░█▒▀█░█░█▒▀█░▀▄█░█▀█\x1b[0m`);
    console.log('\n\n');
    console.log('\x1b[31m%s\x1b[0m', 'Viewers Sent. Please don\'t hurry. If the viewers do not arrive, turn it off and on and do the same operations');

    const browser = await puppeteer.launch({
        headless: true,
        // executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: ['--mute-audio', '--no-sandbox']
    });

    const pages = [];

    for (let i = 0; i < proxyCount; i++) {
        const newPage = await browser.newPage();
        await newPage.setViewport({ width: 1280, height: 720 });

        const navigationResult = await retryWithTimeout(async () => {
            try {
                await newPage.goto(proxyUrl);
                if (consentToggle == true) {
                    await newPage.waitForSelector('text=Consent')
                    await newPage.click('text=Consent');
                    consentToggle = false
                }
                await newPage.type('input[name="url"]', `https://www.twitch.tv/${twitchUsername}`);
                await newPage.keyboard.press('Enter');
                await newPage.waitForNavigation({ timeout: 60000 });
                const startWatchingButton = await newPage.waitForSelector(
                    '[data-a-target="content-classification-gate-overlay-start-watching-button"]', 
                    { timeout: 5000, state: "visible" }
                ).catch(() => null);
                
                if (startWatchingButton) {
                    await startWatchingButton.click();
                    console.log("Clicked Start Watching button.");
                } else {
                    console.log(`'Start Watching' button not found for viewer ${i + 1}. Skipping click.`);
                }
                return true;
            } catch (error) {
                console.error(`Navigation attempt failed: ${error}`);
                return false;
            }
        }, 3, 10); // Retry up to 3 times with a 5-second delay between retries

        if (!navigationResult) {
            console.error(`Navigation failed for viewer ${i + 1}/${proxyCount}. Skipping.`);
            await newPage.close();
        } else {
            console.log(`Virtual viewer ${i + 1}/${proxyCount} spawned.`);
            pages.push(newPage);
        }

        await new Promise(resolve => setTimeout(resolve, 10)); // 5 seconds delay between opening each viewer
    }

    // Start taking screenshots every 5 seconds for each page
    const screenshotIntervals = [];
    for (const page of pages) {
        const viewerNumber = pages.indexOf(page) + 1;
        const screenshotInterval = setInterval(async () => {
            if (!page.isClosed()) {
                const screenshotPath = `screenshots/viewer_${viewerNumber}.png`;
                await page.screenshot({ path: screenshotPath });
                console.log(`Screenshot captured for viewer ${viewerNumber}: ${screenshotPath}`);

                const buttonAvailable = await waitForButton(page);
                if (buttonAvailable) {
                    await page.click('text=Start Watching');
                    console.log(`Button clicked for viewer ${viewerNumber}`);
                }
            }
        }, 1000); // 5 seconds interval for screenshots

        screenshotIntervals.push(screenshotInterval);
    }
}

async function waitForButton(page) {
    try {
        await page.waitForSelector('button[data-a-target="content-classification-gate-overlay-start-watching-button"]', { timeout: 10 });
        return true;
    } catch (error) {
        return false;
    }
}

async function retryWithTimeout(func, maxRetries, delay) {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            return await func();
        } catch (error) {
            console.error(`Attempt ${retries + 1} failed: ${error}`);
            retries++;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error(`Function failed after ${maxRetries} attempts`);
}

if (!fs.existsSync('screenshots')) {
    fs.mkdirSync('screenshots');
}

const screenshotIntervals = [];
main();
