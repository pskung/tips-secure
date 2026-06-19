import { createHandler, StartServer } from "@solidjs/start/server";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.png" />

          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossorigin=""
          />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Athiti:wght@400;500;700&family=Chonburi&family=IBM+Plex+Sans+Thai:wght@400;500;700&family=Kanit:wght@400;500;700&family=Mali:wght@400;500;700&family=Mitr:wght@400;500;700&family=Noto+Sans+Thai:wght@400;500;700&family=Pattaya&family=Prompt:wght@400;500;700&family=Sriracha&display=swap"
          />
          {assets}
        </head>
        <body class="bg-[#faf9f6] text-slate-800">
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));
