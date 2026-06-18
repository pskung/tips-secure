import { createHandler, StartServer } from "@solidjs/start/server";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.png" />
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
