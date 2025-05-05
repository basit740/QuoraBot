import axios from 'axios';
import nodemailer from 'nodemailer';


const COOKIE = process.env.QUORA_COOKIE;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_TO = process.env.EMAIL_TO;


async function searchQuoraFullLinks(keyword) {
  const url = `https://www.quora.com/search?q=${encodeURIComponent(keyword)}&time=day`;

  // --- Define Headers ---
  const headers = {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-language": "en-US,en;q=0.9",
    "priority": "u=0, i", // Browser-specific hint, might be ignored by server
    "sec-ch-ua": "\"Chromium\";v=\"136\", \"Google Chrome\";v=\"136\", \"Not.A/Brand\";v=\"99\"", // Browser-specific hint
    "sec-ch-ua-mobile": "?0", // Browser-specific hint
    "sec-ch-ua-platform": "\"Windows\"", // Browser-specific hint
    "sec-fetch-dest": "document", // Browser-specific hint
    "sec-fetch-mode": "navigate", // Browser-specific hint
    "sec-fetch-site": "none", // Browser-specific hint
    "sec-fetch-user": "?1", // Browser-specific hint
    "upgrade-insecure-requests": "1",
    // *** Important: This cookie will expire! You will likely need a fresh one for consistent results. ***
    "cookie": COOKIE,
    // Add a User-Agent header to mimic a browser more closely (recommended for GET requests)
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
    // The 'referrerPolicy' is a browser fetch option, not a header sent to the server.
    // If a Referer header were needed, you'd add it here: "Referer": "..."
  };


  try {
    const response = await axios.get(url, { headers });
    const html = response.data;

    const regex = new RegExp(`https:\\/\\/www\\.quora\\.com\\/[\\w\\-?=&#%./]*${keyword}[\\w\\-?=&#%./]*`, 'gi');
    const matches = [...html.matchAll(regex)];
    const uniqueLinks = new Set(matches.map(match => match[0]));

    return Array.from(uniqueLinks);
  } catch (err) {
    console.error(`❌ Error for keyword "${keyword}":`, err.message);
    return [];
  }
}

async function sendFormattedQuoraLinksEmail(keywords) {
  let htmlBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>🔍 Quora Search Results</h2>
      <p>This report contains Quora links found for the following keywords:</p>
      <ul style="margin-top: 0;">
        ${keywords.map(k => `<li><strong>${k}</strong></li>`).join('')}
      </ul>
  `;

  for (const keyword of keywords) {
    const links = await searchQuoraFullLinks(keyword.toLowerCase());

    htmlBody += `
      <hr>
      <h3 style="color: #2a6ebb;">🔑 Keyword: ${keyword}</h3>
      ${links.length > 0 ? '<ul>' + links.map(link => `<li><a href="${link}" target="_blank">${link}</a></li>`).join('') + '</ul>' 
                         : '<p style="color: gray;">No links found.</p>'}
    `;
  }

  htmlBody += `</div>`;

  // ✅ Configure the Gmail SMTP transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });

  const mailOptions = {
    from: '"Quora Link Bot" <ranatechpak@gmail.com>',
    to: EMAIL_TO,
    subject: '📬 Quora Keyword Link Report',
    html: htmlBody
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.response);
  } catch (err) {
    console.error("❌ Failed to send email:", err.message);
  }
}

// Run the job
const keywords = ['iphone', 'android'];
sendFormattedQuoraLinksEmail(keywords);
