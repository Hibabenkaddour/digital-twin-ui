const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    
    await page.goto('http://localhost:5173');
    await new Promise(r => setTimeout(r, 2000));
    
    const btns = await page.$$('button');
    for (const b of btns) {
        const text = await b.evaluate(node => node.innerText);
        if (text.toLowerCase() === 'bar') {
            await b.click();
            console.log('Clicked Bar button');
            break;
        }
    }
    
    await new Promise(r => setTimeout(r, 6000));
    await browser.close();
})();
