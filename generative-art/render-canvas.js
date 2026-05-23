const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function renderCanvas() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set viewport to match canvas size
    await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2  // High DPI for crisp output
    });

    // Load the HTML file
    const htmlPath = path.join(__dirname, 'chromatic-membrane-canvas.html');
    await page.goto(`file://${htmlPath}`, {
        waitUntil: 'networkidle0'
    });

    // Wait for fonts to load
    await page.evaluateHandle('document.fonts.ready');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Take screenshot of just the canvas
    const canvasElement = await page.$('.canvas');
    await canvasElement.screenshot({
        path: path.join(__dirname, 'chromatic-membrane.png'),
        type: 'png'
    });

    console.log('✓ Rendered chromatic-membrane.png (2400x3200px @ 2x DPI)');

    await browser.close();
}

renderCanvas().catch(console.error);
