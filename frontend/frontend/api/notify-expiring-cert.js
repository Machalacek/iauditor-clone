import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { cert } = req.body;
  if (!cert) return res.status(400).send("Missing cert info");

  // For security, use environment variables for real credentials!
  const transporter = nodemailer.createTransport({
    service: "gmail", // or use SMTP for your domain
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: `"Cert Expiry Bot" <${process.env.EMAIL_USER}>`,
    to: "info@moraviaprime.ca",
    subject: `Certification Expiry Alert: ${cert.name}`,
    text: `The certification "${cert.name}" for user "${cert.user}" is expiring on ${cert.expiry}.\n\nPlease take action.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: "Email sent!" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}
