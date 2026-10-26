const { spawn } = require('child_process');
const http = require('http');

async function getPaperBgStyle() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(chromePath, [
    '--headless',
    '--remote-debugging-port=9231',
    '--no-sandbox',
    '--disable-gpu',
    'https://cocohappii.com/invite/demo-quoctoan-bichphuong'
  ]);

  await new Promise(r => setTimeout(r, 4000));

  http.get('http://127.0.0.1:9231/json', (res) => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', async () => {
      const tabs = JSON.parse(raw);
      const ws = new globalThis.WebSocket(tabs[0].webSocketDebuggerUrl);

      ws.onopen = () => {
        let id = 1;
        const send = (method, params = {}) => ws.send(JSON.stringify({ id: id++, method, params }));
        send('Runtime.enable');

        setTimeout(() => {
          send('Runtime.evaluate', {
            expression: `
              (function() {
                const el = document.querySelector('.paper-bg') || document.getElementById('save-the-date');
                const st = el ? window.getComputedStyle(el) : null;
                const matchedRules = [];
                for (let i = 0; i < document.styleSheets.length; i++) {
                  try {
                    const sheet = document.styleSheets[i];
                    for (let j = 0; j < sheet.cssRules.length; j++) {
                      const r = sheet.cssRules[j];
                      if (r.selectorText && (r.selectorText.includes('paper-bg') || r.selectorText.includes('card-section') || r.selectorText.includes('decor-flower'))) {
                        matchedRules.push({ selector: r.selectorText, cssText: r.cssText });
                      }
                    }
                  } catch (e) {}
                }
                return {
                  matchedRules: matchedRules,
                  bg: st ? st.backgroundColor : null,
                  bgImg: st ? st.backgroundImage : null,
                  bgRepeat: st ? st.backgroundRepeat : null,
                  bgSize: st ? st.backgroundSize : null,
                  htmlSnippet: el ? el.outerHTML.slice(0, 500) : null
                };
              })()
            `,
            returnByValue: true
          });
        }, 1500);

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === 2) {
            console.log('PAPER BG RESULT:', JSON.stringify(msg.result?.result?.value, null, 2));
            ws.close();
            proc.kill();
            process.exit(0);
          }
        };
      };
    });
  });
}

getPaperBgStyle();
