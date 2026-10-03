import net from 'net';
import tls from 'tls';

/**
 * Lightweight, zero-dependency SMTP Transport supporting SSL/TLS (port 465) and STARTTLS (port 587).
 * Works natively with Gmail, Outlook, Amazon SES, Brevo, and custom SMTP servers.
 */
export function sendSmtpEmail({ host, port, secure, user, pass, fromName, fromEmail, to, subject, body, isHtml = true }) {
  return new Promise((resolve, reject) => {
    if (!host || !user || !pass || !to) {
      return reject(new Error('SMTP Config Error: Missing host, username, password, or recipient email.'));
    }

    const smtpPort = Number(port) || 465;
    const isSsl = secure !== undefined ? Boolean(secure) : smtpPort === 465;

    const senderEmail = fromEmail || user;
    const senderHeader = fromName ? `"${fromName}" <${senderEmail}>` : senderEmail;

    // Format body lines to ensure CRLF and escape leading dots
    const formattedBody = body.split('\n').map(line => line.endsWith('\r') ? line.slice(0, -1) : line)
      .map(line => line.startsWith('.') ? '.' + line : line)
      .join('\r\n');

    const emailHeadersAndBody = [
      `From: ${senderHeader}`,
      `To: <${to}>`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: ${isHtml ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8'}`,
      `X-Mailer: WA-Email-Automation-Suite`,
      ``,
      formattedBody,
      `.`
    ].join('\r\n');

    let step = 0;
    let buffer = '';
    let socket;

    const sendCmd = (cmd) => {
      if (socket && socket.writable) {
        socket.write(cmd + '\r\n');
      }
    };

    const handleData = (data) => {
      buffer += data.toString();
      const lines = buffer.split('\r\n');
      buffer = lines.pop(); // Retain incomplete line fragment

      for (const line of lines) {
        if (!line) continue;
        const code = parseInt(line.substring(0, 3), 10);

        // Ignore intermediate multi-line EHLO responses (format: 250-...)
        if (line.length >= 4 && line[3] === '-') continue;

        if (code >= 400) {
          if (socket) socket.destroy();
          return reject(new Error(`SMTP Error (${code}): ${line}`));
        }

        switch (step) {
          case 0: // Server Greeting 220
            step = 1;
            sendCmd(`EHLO localhost`);
            break;

          case 1: // EHLO Response
            if (!isSsl && smtpPort === 587) {
              step = 2; // Request STARTTLS
              sendCmd('STARTTLS');
            } else {
              step = 3; // AUTH LOGIN
              sendCmd('AUTH LOGIN');
            }
            break;

          case 2: // STARTTLS Approved -> Upgrade Socket to TLS
            {
              const tlsSocket = tls.connect({ socket, rejectUnauthorized: false }, () => {
                step = 1.5;
                sendCmd('EHLO localhost');
              });
              socket = tlsSocket;
              socket.on('data', handleData);
              socket.on('error', (err) => reject(err));
            }
            break;

          case 1.5: // EHLO after TLS upgrade
            step = 3;
            sendCmd('AUTH LOGIN');
            break;

          case 3: // AUTH LOGIN Prompt -> Send Base64 Username
            step = 4;
            sendCmd(Buffer.from(user).toString('base64'));
            break;

          case 4: // Username Prompt -> Send Base64 Password
            step = 5;
            sendCmd(Buffer.from(pass).toString('base64'));
            break;

          case 5: // Authentication Successful (235) -> Send MAIL FROM
            step = 6;
            sendCmd(`MAIL FROM:<${senderEmail}>`);
            break;

          case 6: // Sender Accepted (250) -> Send RCPT TO
            step = 7;
            sendCmd(`RCPT TO:<${to}>`);
            break;

          case 7: // Recipient Accepted (250) -> Request DATA
            step = 8;
            sendCmd('DATA');
            break;

          case 8: // Ready for Data (354) -> Send Full Email Content
            step = 9;
            socket.write(emailHeadersAndBody + '\r\n');
            break;

          case 9: // Message Delivered (250) -> Send QUIT
            step = 10;
            sendCmd('QUIT');
            resolve({ success: true, message: 'Email sent successfully via SMTP.' });
            break;
        }
      }
    };

    try {
      if (isSsl) {
        socket = tls.connect(smtpPort, host, { rejectUnauthorized: false });
      } else {
        socket = net.connect(smtpPort, host);
      }

      socket.setTimeout(20000, () => {
        socket.destroy();
        reject(new Error('SMTP Connection timed out (20s). Check server host, port & network connection.'));
      });

      socket.on('data', handleData);
      socket.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}
