import axios from 'axios';
import nodemailer from 'nodemailer';

const COOKIE = process.env.QUORA_COOKIE;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_TO = process.env.EMAIL_TO;
const KEYWORDS = process.env.KEYWORDS?.split(',').map(k => k.trim()) || [];

console.log("✅ Loaded KEYWORDS from ENV:", process.env.KEYWORDS);
console.log("✅ Parsed:", process.env.KEYWORDS?.split(',').map(k => k.trim()));


async function searchQuoraFullLinks(keyword) {
  const url = `https://www.quora.com/search?q=${encodeURIComponent(keyword)}&time=day`;

  const headers = {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.9",
    "cookie": COOKIE,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
  };

  try {
    const response = await axios.get(url, { headers });
    const html = response.data;

    const regex = new RegExp(`https:\\/\\/www\\.quora\\.com\\/[\\w\\-?=&#%./]*${keyword}[\\w\\-?=&#%./]*`, 'gi');
    const matches = [...html.matchAll(regex)];
    const uniqueLinks = new Set(matches.map(match => match[0]));

    return Array.from(uniqueLinks);
  } catch (err) {
    console.error(`❌ Error fetching results for "${keyword}":`, err.message);
    return [];
  }
}

async function sendFormattedQuoraLinksEmail(keywords) {
  let htmlBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>🔍 Quora Daily Search Report</h2>
      <p>Search results for the following keywords:</p>
      <ul>
        ${keywords.map(k => `<li><strong>${k}</strong></li>`).join('')}
      </ul>
  `;

  for (const keyword of keywords) {
    const links = await searchQuoraFullLinks(keyword.toLowerCase());

    htmlBody += `
      <hr>
      <h3 style="color: #2a6ebb;">🔑 ${keyword}</h3>
      ${links.length > 0 
        ? '<ul>' + links.map(link => `<li><a href="${link}" target="_blank">${link}</a></li>`).join('') + '</ul>' 
        : '<p style="color: gray;">No results found.</p>'}
    `;
  }

  htmlBody += `</div>`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });

  const mailOptions = {
    from: `"Quora Bot" <${EMAIL_USER}>`,
    to: EMAIL_TO,
    subject: '📬 Quora Keyword Report (Daily)',
    html: htmlBody
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.response);
  } catch (err) {
    console.error("❌ Failed to send email:", err.message);
  }
}

// Entry point
if (KEYWORDS.length === 0) {
  console.warn("⚠️ No keywords found in environment variable KEYWORDS.");
} else if (!EMAIL_TO) {
  console.warn("⚠️ Missing EMAIL_TO environment variable.");
} else {
  sendFormattedQuoraLinksEmail(KEYWORDS);
}
