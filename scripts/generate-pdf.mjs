import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';
import path from 'node:path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const executablePath = existsSync(chromePath) ? chromePath : edgePath;

console.log('Launching browser at:', executablePath);

const htmlPath = path.resolve('report.html');
const pdfPath = path.resolve('Sentinel_Project_Report.pdf');

try {
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
  console.log('Navigating to:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  console.log('Generating PDF...');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '18mm',
      bottom: '18mm',
      left: '20mm',
      right: '20mm'
    },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="font-family: 'Times New Roman', Times, serif; font-size: 9.5pt; width: 100%; display: flex; justify-content: space-between; padding-left: 20mm; padding-right: 20mm; color: #555;">
        <span>Sentinel — Disaster Route Assistant</span>
        <span>Page <span class="pageNumber"></span></span>
      </div>
    `
  });

  await browser.close();
  console.log('SUCCESS: PDF saved to', pdfPath);
} catch (err) {
  console.error('Error generating PDF:', err);
  process.exit(1);
}
